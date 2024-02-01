import { Mutex } from 'async-mutex'
import { createLogger } from './logger.mjs'
import {
    AVAILABLE_ALARMS,
    AVAILABLE_FLAGS,
    AVAILABLE_SETTINGS,
    createModelNameString,
    getAutomationAndHeatingTypeName,
    getCoolingTypeName,
    getDeviceFamilyName,
    hasRoomTemperatureSensor,
    MUTUALLY_EXCLUSIVE_MODES,
    parseAlarmTimestamp,
    parseAnalogSensors,
    parseStateBitField,
    parseTemperature,
} from './enervent.mjs'

export const MODBUS_DEVICE_TYPE = {
    'RTU': 'rtu',
    'TCP': 'tcp',
}

const mutex = new Mutex()
const logger = createLogger('modbus')

export const getFlagSummary = async (modbusClient) => {
    let result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, 0, 13))
    let summary = {
        // 'stop': result.data[0], // - Can not return value if stopped.
        'away': result.data[1],
        'longAway': result.data[2],
        'overPressure': result.data[3],
        'cookerHood': result.data[4],
        'centralVacuumCleaner': result.data[5],
        'maxHeating': result.data[6],
        'maxCooling': result.data[7],
        'manualBoost': result.data[10],
        'summerNightCooling': result.data[12],
    }

    result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, 40, 1))
    summary = {
        ...summary,
        'eco': result.data[0],
    }

    return summary
}

export const getFlag = async (modbusClient, flag) => {
    if (AVAILABLE_FLAGS[flag] === undefined) {
        throw new Error('Unknown flag')
    }

    const result = await mutex.runExclusive(async () => tryReadCoils(modbusClient, AVAILABLE_FLAGS[flag], 1))

    return result.data[0]
}

export const setFlag = async (modbusClient, flag, value) => {
    if (AVAILABLE_FLAGS[flag] === undefined) {
        throw new Error('Unknown flag')
    }

    await mutex.runExclusive(async () => tryWriteCoils(modbusClient, AVAILABLE_FLAGS[flag], value))

    // Flags are mutually exclusive, disable all others when enabling one
    if (value) {
        await disableAllModesExcept(modbusClient, flag)
    }
}

const disableAllModesExcept = async (modbusClient, exceptedMode) => {
    for (const mode in MUTUALLY_EXCLUSIVE_MODES) {
        if (mode === exceptedMode) {
            continue
        }

        await mutex.runExclusive(async () => tryWriteCoils(modbusClient, AVAILABLE_FLAGS[mode], false))
    }
}

export const getReadings = async (modbusClient) => {
    logger.debug('Retrieving device readings...')

    let result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 6, 8))
    let readings = {
        'freshAirTemperature': parseTemperature(result.data[0]),
        'supplyAirTemperatureAfterHeatRecovery': parseTemperature(result.data[1]),
        'supplyAirTemperature': parseTemperature(result.data[2]),
        'wasteAirTemperature': parseTemperature(result.data[3]),
        'exhaustAirTemperature': parseTemperature(result.data[4]),
        'exhaustAirTemperatureBeforeHeatRecovery': parseTemperature(result.data[5]),
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

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 47, 3))
    readings = {
        ...readings,
        'cascadeSp': result.data[0],
        'cascadeP': result.data[1],
        'cascadeI': result.data[2],
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

    // Room temperature average is always available, but its value is always zero unless one or more optional
    // room temperature sensor are installed
    if (hasRoomTemperatureSensor(sensorTypesResult)) {
        result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 46, 1))
        readings = {
            ...readings,
            'roomTemperatureAvg': parseTemperature(result.data[0]),
        }
    }

    return readings
}

export const getSettings = async (modbusClient) => {
    logger.debug('Retrieving device settings...')

    let result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 57, 1))
    let settings = {
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

    result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 135, 1))
    settings = {
        ...settings,
        'temperatureTarget': parseTemperature(result.data[0]),
    }

    // Heating/cooling/heat recovery enabled in normal/away/long away modes. Note that the register order is swapped
    // when querying register 18-21 compared to 52-55.
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

    return settings
}

export const setSetting = async (modbusClient, setting, value) => {
    if (AVAILABLE_SETTINGS[setting] === undefined) {
        throw new Error('Unknown setting')
    }

    let coil = false
    let intValue = parseInt(value, 10)

    switch (setting) {
        case 'awayVentilationLevel':
        case 'longAwayVentilationLevel':
            if (intValue < 20 || intValue > 100) {
                throw new RangeError('level out of range')
            }

            break
        case 'temperatureTarget':
            if (intValue < 10 || intValue > 30) {
                throw new RangeError('temperature out of range')
            }

            intValue *= 10
            break
        case 'overPressureDelay':
            if (intValue < 0 || intValue > 60) {
                throw new RangeError('delay out of range')
            }

            break
        case 'awayTemperatureReduction':
        case 'longAwayTemperatureReduction':
            // No minimum/maximum values specified in the register documentation
            intValue *= 10
            break
        case 'coolingAllowed':
        case 'heatingAllowed':
        case 'awayCoolingAllowed':
        case 'awayHeatingAllowed':
        case 'longAwayCoolingAllowed':
        case 'longAwayHeatingAllowed':
            coil = true
            break
    }

    // This isn't very nice, but it's good enough for now
    if (coil) {
        await mutex.runExclusive(async () => modbusClient.writeCoil(AVAILABLE_SETTINGS[setting], value))
    } else {
        await mutex.runExclusive(async () => modbusClient.writeRegister(AVAILABLE_SETTINGS[setting], intValue))
    }
}

export const getDeviceInformation = async (modbusClient) => {
    logger.debug('Retrieving device information...')

    // Start by reading the firmware version
    let result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 599, 1))
    let deviceInformation = {
        'softwareVersion': result.data[0] / 100,
        'softwareVersionInt': result.data[0],
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

    return deviceInformation
}

export const getAlarmHistory = async (modbusClient) => {
    let alarmHistory = []

    const startRegister = 385
    const endRegister = 518
    const alarmOffset = 7

    for (let register = startRegister; register <= endRegister; register += alarmOffset) {
        const result = await mutex.runExclusive(async () =>
            tryReadHoldingRegisters(modbusClient, register, alarmOffset)
        )
        const code = result.data[0]
        const state = result.data[1]

        // Skip unset alarm slots and unknown alarm types
        if (AVAILABLE_ALARMS[code] === undefined) {
            continue
        }

        let alarm = Object.assign({}, AVAILABLE_ALARMS[code])
        alarm.state = state
        alarm.date = parseAlarmTimestamp(result)

        alarmHistory.push(alarm)
    }

    return alarmHistory
}

export const getAlarmStatuses = async (modbusClient) => {
    let alarms = { ...AVAILABLE_ALARMS }

    // Use the alarm history to determine the state of each alarm
    const alarmHistory = await getAlarmHistory(modbusClient)

    for (const code in alarms) {
        // Use "off" as the default alarm state, most likely to be true
        alarms[code].state = 0

        for (const historicAlarm of alarmHistory) {
            if (historicAlarm.name === alarms[code].name && historicAlarm.state > 0) {
                alarms[code].state = historicAlarm.state
            }
        }
    }

    return alarms
}

export const getDeviceState = async (modbusClient) => {
    const result = await mutex.runExclusive(async () => tryReadHoldingRegisters(modbusClient, 44, 1))

    return parseStateBitField(result.data[0])
}

export const validateDevice = (device) => {
    return device.startsWith('/') || device.startsWith('tcp://')
}

export const parseDevice = (device) => {
    if (device.startsWith('/')) {
        // Serial device
        return {
            type: MODBUS_DEVICE_TYPE.RTU,
            path: device,
        }
    } else {
        // TCP URL
        const deviceUrl = new URL(device)
        return {
            type: MODBUS_DEVICE_TYPE.TCP,
            hostname: deviceUrl.hostname,
            port: parseInt(deviceUrl.port, 10),
        }
    }
}

const tryReadCoils = async (modbusClient, dataAddress, length) => {
    try {
        logger.debug(`Reading coil address ${dataAddress}, length ${length}`)
        return await modbusClient.readCoils(dataAddress, length)
    } catch (e) {
        logger.error(`Failed to read coil address ${dataAddress}, length ${length}`)
        throw e
    }
}

const tryWriteCoils = async (modbusClient, dataAddress, value) => {
    try {
        logger.debug(`Writing ${value} to coil address ${dataAddress}`)
        return await modbusClient.writeCoil(dataAddress, value)
    } catch (e) {
        logger.error(`Failed to write coil address ${dataAddress}, value ${value}`)
        throw e
    }
}

const tryReadHoldingRegisters = async (modbusClient, dataAddress, length) => {
    try {
        logger.debug(`Reading holding register address ${dataAddress}, length ${length}`)
        return await modbusClient.readHoldingRegisters(dataAddress, length)
    } catch (e) {
        logger.error(`Failed to read holding register address ${dataAddress}, length ${length}`)
        throw e
    }
}
