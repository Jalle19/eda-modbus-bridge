import { Mutex } from 'async-mutex'
import { createLogger } from './logger'
import {
    AlarmIncident,
    AutomationType,
    AVAILABLE_ALARMS,
    AVAILABLE_MODES,
    AVAILABLE_SETTINGS,
    createModelNameString,
    determineAutomationType,
    getAutomationAndHeatingTypeName,
    getCoolingTypeName,
    getDeviceFamilyName,
    parseAlarmTimestamp,
    parseAnalogSensors,
    parseStateBitField,
    parseTemperature,
    DeviceInformation,
    ModeSummary,
    Readings,
    Settings,
    AlarmStatus,
    HeatingType,
    TemperatureControlState,
    CoilSettingConfiguration,
    HoldingRegisterSettingConfiguration,
} from './enervent'
import ModbusRTU from 'modbus-serial'
import { ReadCoilResult, ReadRegisterResult } from 'modbus-serial/ModbusRTU'

export enum ModbusDeviceType {
    RTU = 'RTU',
    TCP = 'TCP',
}

export type ModbusRtuDevice = {
    type: ModbusDeviceType
    path: string
}

export type ModbusTcpDevice = {
    type: ModbusDeviceType
    hostname: string
    port: number
}

export type ModbusDevice = ModbusRtuDevice | ModbusTcpDevice

const mutex = new Mutex()
const logger = createLogger('modbus')

// Runtime cache for device information (retrieved once per run only since the information doesn't change)
let CACHED_DEVICE_INFORMATION: DeviceInformation

export const getModeSummary = async (modbusClient: ModbusRTU): Promise<ModeSummary> => {
    let result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, 0, 13))
    let summary: ModeSummary = {
        // 'stop': result.data[0], // - Can not return value if stopped.
        'away': result.data[1],
        'longAway': result.data[2],
        'overPressure': result.data[3],
        'maxHeating': result.data[6],
        'maxCooling': result.data[7],
        'manualBoost': result.data[10],
    }

    // "eco" is a newfangled thing only available on newer units
    const deviceInformation = await getDeviceInformation(modbusClient)
    if (deviceInformation.automationType === AutomationType.MD) {
        result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, 40, 1))
        summary = {
            ...summary,
            'eco': result.data[0],
        }
    }

    return summary
}

export const getMode = async (modbusClient: ModbusRTU, mode: string): Promise<boolean> => {
    const modeConfig = AVAILABLE_MODES.find((c) => c.name === mode)

    if (!modeConfig) {
        throw new Error('Unknown mode')
    }

    // Special case for "normal" which is not represented by a specific coil, but can be gleaned from
    // the device state
    if (!modeConfig.dataAddress) {
        const deviceState = await getDeviceState(modbusClient)

        return deviceState['normal']
    }

    const result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, modeConfig.dataAddress!, 1))

    return result.data[0]
}

export const setMode = async (modbusClient: ModbusRTU, mode: string, value: boolean) => {
    const modeConfig = AVAILABLE_MODES.find((c) => c.name === mode)

    if (!modeConfig) {
        throw new Error('Unknown mode')
    }

    if (modeConfig.dataAddress) {
        await mutex.runExclusive(async () => tryWriteCoil(modbusClient, modeConfig.dataAddress!, value))
    }

    // Modes are mutually exclusive, disable all others when enabling one
    if (value) {
        await disableAllModesExcept(modbusClient, mode)
    }
}

const disableAllModesExcept = async (modbusClient: ModbusRTU, exceptedMode: string) => {
    for (const modeConfig of AVAILABLE_MODES) {
        if (modeConfig.name === exceptedMode) {
            continue
        }

        if (modeConfig.dataAddress) {
            await mutex.runExclusive(async () => tryWriteCoil(modbusClient, modeConfig.dataAddress!, false))
        }
    }
}

export const getReadings = async (modbusClient: ModbusRTU): Promise<Readings> => {
    logger.debug('Retrieving device readings...')

    let result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 6, 8))
    let readings: Partial<Readings> = {
        'freshAirTemperature': parseTemperature(result.data[0]),
        'supplyAirTemperatureAfterHeatRecovery': parseTemperature(result.data[1]),
        'supplyAirTemperature': parseTemperature(result.data[2]),
        'wasteAirTemperature': parseTemperature(result.data[3]),
        'exhaustAirTemperature': parseTemperature(result.data[4]),
        'exhaustAirHumidity': result.data[7],
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 29, 7))
    readings = {
        ...readings,
        'heatRecoverySupplySide': result.data[0],
        'heatRecoveryExhaustSide': result.data[1],
        'heatRecoveryTemperatureDifferenceSupplySide': parseTemperature(result.data[2]),
        'heatRecoveryTemperatureDifferenceExhaustSide': parseTemperature(result.data[3]),
        'mean48HourExhaustHumidity': result.data[6],
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 45, 5))
    readings = {
        ...readings,
        'temperatureControlState': TemperatureControlState[result.data[0]],
        'cascadeSp': result.data[2],
        'cascadeP': result.data[3],
        'cascadeI': result.data[4],
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 56, 1))
    readings = {
        ...readings,
        'overPressureTimeLeft': result.data[0],
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 50, 4))
    readings = {
        ...readings,
        'ventilationLevelActual': result.data[0],
        'ventilationLevelTarget': result.data[3],
    }

    // Analog input sensors. We need to query for the type of sensor in order to parse the data correctly. An
    // analog input can be configured but not present - in this case we trust the user and simply report 0 for the
    // value.
    const sensorTypesResult = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 104, 6))
    const sensorValuesResult = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 23, 6))
    const sensorReadings = parseAnalogSensors(sensorTypesResult, sensorValuesResult)

    readings = {
        ...readings,
        ...sensorReadings,
    }

    // Room temperature average (register 46). Contains average of analog sensors (types 8/9/10)
    // or dedicated room temperature sensor (e.g., RJ10). Zero if no sensor configured.
    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 46, 1))
    readings = {
        ...readings,
        'roomTemperatureAvg': parseTemperature(result.data[0]),
    }

    // Sensors that only work reliably on MD automation devices
    const deviceInformation = await getDeviceInformation(modbusClient)
    if (deviceInformation.automationType === AutomationType.MD) {
        result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 1, 4))
        readings = {
            ...readings,
            'controlPanel1Temperature': parseTemperature(result.data[0]),
            'controlPanel2Temperature': parseTemperature(result.data[1]),
            'supplyFanSpeed': result.data[2],
            'exhaustFanSpeed': result.data[3],
        }
    }

    // Register 11 and 12 are mutually exclusive, depending on whether the unit is EDW/MDW or not.
    // While the value stored in both registers are always identical we publish two separate
    // sensors to avoid confusion.
    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 11, 2))
    if (deviceInformation.heatingTypeInstalled === HeatingType.EDW) {
        readings = {
            ...readings,
            'returnWaterTemperature': parseTemperature(result.data[1]),
        }
    } else {
        readings = {
            ...readings,
            'exhaustAirTemperatureBeforeHeatRecovery': parseTemperature(result.data[0]),
        }
    }

    return readings as Readings
}

export const getSettings = async (modbusClient: ModbusRTU): Promise<Settings> => {
    logger.debug('Retrieving device settings...')

    let result: ReadRegisterResult | ReadCoilResult

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 57, 1))
    let settings: Partial<Settings> = {
        'overPressureDelay': result.data[0],
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 100, 4))
    settings = {
        ...settings,
        'awayVentilationLevel': result.data[0],
        'awayTemperatureReduction': parseTemperature(result.data[1]),
        'longAwayVentilationLevel': result.data[2],
        'longAwayTemperatureReduction': parseTemperature(result.data[3]),
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 135, 2))
    settings = {
        ...settings,
        'temperatureTarget': parseTemperature(result.data[0]),
        'temperatureControlMode': result.data[1],
    }

    // Heating/cooling/heat recovery enabled in normal/away/long away modes (not available on some devices).
    // Note that the register order is swapped when querying register 18-21 compared to 52-55.
    const deviceInformation = await getDeviceInformation(modbusClient)
    if (deviceInformation.automationType !== AutomationType.LEGACY_EDA) {
        result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, 52, 3))
        settings = {
            ...settings,
            'coolingAllowed': result.data[0],
            'heatingAllowed': result.data[2],
        }

        result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, 18, 4))
        settings = {
            ...settings,
            'awayCoolingAllowed': result.data[1],
            'awayHeatingAllowed': result.data[0],
            'longAwayCoolingAllowed': result.data[3],
            'longAwayHeatingAllowed': result.data[2],
        }
    }

    // Defrosting allowed
    result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, 55, 1))
    settings = {
        ...settings,
        'defrostingAllowed': result.data[0],
    }

    // Summer night cooling allowed
    result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, 12, 1))
    settings = {
        ...settings,
        'summerNightCoolingAllowed': result.data[0],
    }

    // Fan speeds during over-pressurization
    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 54, 2))
    settings = {
        ...settings,
        'supplyFanOverPressure': result.data[0],
        'exhaustFanOverPressure': result.data[1],
    }

    return settings as Settings
}

const parseSettingValue = (settingConfig: HoldingRegisterSettingConfiguration, value: string): number => {
    if (settingConfig.decimals > 0) {
        const multiplier = Math.pow(10, settingConfig.decimals)
        return Math.round(parseFloat(value) * multiplier) / multiplier
    } else {
        return parseInt(value, 10)
    }
}

export const setSetting = async (modbusClient: ModbusRTU, setting: string, value: string | boolean) => {
    const settingConfig = AVAILABLE_SETTINGS[setting]
    if (settingConfig === undefined) {
        throw new Error(`Unknown setting "${setting}"`)
    }

    switch (settingConfig.registerType) {
        case 'holding': {
            // Holding registers expect numeric (string) values
            if (typeof value !== 'string') {
                throw new TypeError(`Setting "${setting}" expects a numeric value, got ${typeof value}`)
            }
            const numericValue = parseSettingValue(settingConfig, value)
            return setNumericSetting(modbusClient, settingConfig, numericValue)
        }
        case 'coil': {
            // Coils expect boolean values
            if (typeof value !== 'boolean') {
                throw new TypeError(`Setting "${setting}" expects a boolean value, got ${typeof value}`)
            }
            return setBooleanSetting(modbusClient, settingConfig, value)
        }
        case 'special':
            if (setting === 'mode') {
                logger.info('Changing mode to ' + value)
                break
            }
    }
}

const setBooleanSetting = async (
    modbusClient: ModbusRTU,
    settingConfig: CoilSettingConfiguration,
    boolValue: boolean
) => {
    await mutex.runExclusive(async () => tryWriteCoil(modbusClient, settingConfig.dataAddress, boolValue))
}

const setNumericSetting = async (
    modbusClient: ModbusRTU,
    settingConfig: HoldingRegisterSettingConfiguration,
    numericValue: number
) => {
    // Validate against min/max if specified
    if (settingConfig.min !== undefined && numericValue < settingConfig.min) {
        throw new RangeError(`value ${numericValue} below minimum ${settingConfig.min}`)
    }
    if (settingConfig.max !== undefined && numericValue > settingConfig.max) {
        throw new RangeError(`value ${numericValue} above maximum ${settingConfig.max}`)
    }

    // Apply register scaling (default 1 = no scaling)
    const scaledValue = numericValue * (settingConfig.registerScale ?? 1)

    await mutex.runExclusive(async () => tryWriteHoldingRegister(modbusClient, settingConfig.dataAddress, scaledValue))
}

export const getDeviceInformation = async (modbusClient: ModbusRTU): Promise<DeviceInformation> => {
    if (CACHED_DEVICE_INFORMATION) {
        return CACHED_DEVICE_INFORMATION
    }

    logger.debug('Retrieving device information...')

    let result: ReadRegisterResult | ReadCoilResult

    // Start by reading the firmware version and determining the firmware type
    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 599, 1))
    let deviceInformation: Partial<DeviceInformation> = {
        'softwareVersion': result.data[0] / 100,
        'automationType': determineAutomationType(result.data[0]),
    }

    // Motor type
    result = await mutex.runExclusive(async () => await tryReadCoils(modbusClient, 16, 1))
    deviceInformation = {
        ...deviceInformation,
        // EC means DC motors
        'fanType': result.data[0] ? 'EC' : 'AC',
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 154, 1))
    deviceInformation = {
        ...deviceInformation,
        'coolingTypeInstalled': getCoolingTypeName(result.data[0]),
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 171, 1))
    deviceInformation = {
        ...deviceInformation,
        'heatingTypeInstalled': getAutomationAndHeatingTypeName(result.data[0]),
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 596, 3))
    deviceInformation = {
        ...deviceInformation,
        'modelType': getDeviceFamilyName(result.data[1]),
        'serialNumber': result.data[2],
    }

    deviceInformation = {
        ...deviceInformation,
        'modelName': createModelNameString(deviceInformation),
    }

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 640, 1))
    deviceInformation = {
        ...deviceInformation,
        'modbusAddress': result.data[0],
    }

    CACHED_DEVICE_INFORMATION = deviceInformation as DeviceInformation
    return deviceInformation as DeviceInformation
}

export const getAlarmSummary = async (modbusClient: ModbusRTU): Promise<AlarmStatus[]> => {
    const alarmSummary: AlarmStatus[] = []
    const newestAlarm = await getNewestAlarm(modbusClient)

    for (const alarm of AVAILABLE_ALARMS) {
        // Add each available alarm and have the state reflect the currently active alarm's state, if any
        alarmSummary.push({
            ...alarm,
            state: alarm.type === newestAlarm?.type ? newestAlarm.state : 0,
        })
    }

    return alarmSummary
}

export const getNewestAlarm = async (modbusClient: ModbusRTU): Promise<AlarmIncident | null> => {
    const result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 385, 7))

    const type = result.data[0]
    const state = result.data[1]
    const timestamp = parseAlarmTimestamp(result)

    const alarm = AVAILABLE_ALARMS.find((alarm) => alarm.type === type)
    if (alarm === undefined) {
        return null
    }

    return {
        ...alarm,
        state,
        timestamp,
    }
}

export const acknowledgeAlarm = async (modbusClient: ModbusRTU) => {
    await tryWriteHoldingRegister(modbusClient, 386, 1)
}

export const getDeviceState = async (modbusClient: ModbusRTU) => {
    const result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 44, 1))

    return parseStateBitField(result.data[0])
}

export const validateDevice = (device: string) => {
    return device.startsWith('/') || device.startsWith('tcp://')
}

export const parseDevice = (device: string): ModbusDevice => {
    if (device.startsWith('/')) {
        // Serial device
        return {
            type: ModbusDeviceType.RTU,
            path: device,
        }
    } else {
        // TCP URL
        const deviceUrl = new URL(device)
        return {
            type: ModbusDeviceType.TCP,
            hostname: deviceUrl.hostname,
            port: parseInt(deviceUrl.port, 10),
        }
    }
}

const tryReadCoils = async (modbusClient: ModbusRTU, dataAddress: number, length: number) => {
    try {
        logger.debug(`Reading coil address ${dataAddress}, length ${length}`)
        return await modbusClient.readCoils(dataAddress, length)
    } catch (e) {
        logger.error(`Failed to read coil address ${dataAddress}, length ${length}`)
        throw e
    }
}

const tryWriteCoil = async (modbusClient: ModbusRTU, dataAddress: number, value: boolean) => {
    try {
        logger.debug(`Writing ${value} to coil address ${dataAddress}`)
        return await modbusClient.writeCoil(dataAddress, value)
    } catch (e) {
        logger.error(`Failed to write coil address ${dataAddress}, value ${value}`)
        throw e
    }
}

const tryReadHoldingRegisters = async (modbusClient: ModbusRTU, dataAddress: number, length: number) => {
    try {
        logger.debug(`Reading holding register address ${dataAddress}, length ${length}`)
        return await modbusClient.readHoldingRegisters(dataAddress, length)
    } catch (e) {
        logger.error(`Failed to read holding register address ${dataAddress}, length ${length}`)
        throw e
    }
}

const tryWriteHoldingRegister = async (modbusClient: ModbusRTU, dataAddress: number, value: number) => {
    try {
        logger.debug(`Writing ${value} to holding register address ${dataAddress}`)
        return await modbusClient.writeRegister(dataAddress, value)
    } catch (e) {
        logger.error(`Failed to write holding register address ${dataAddress}, value ${value}`)
        throw e
    }
}
