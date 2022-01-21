import { Mutex } from 'async-mutex'

const AVAILABLE_FLAGS = {
    'away': 1,
    'longAway': 2,
    'overPressure': 3,
    'maxHeating': 6,
    'maxCooling': 7,
    'manualBoost': 10,
    'summerNightCooling': 12,
}

// Modes that can only be true one at a time (mapped to their coil number)
const MUTUALLY_EXCLUSIVE_MODES = {
    'away': 1,
    'longAway': 2,
    'overPressure': 3,
    'maxHeating': 6,
    'maxCooling': 7,
    'manualBoost': 10,
}

const AVAILABLE_SETTINGS = {
    'overPressureDelay': 57,
    'awayVentilationLevel': 100,
    'awayTemperatureReduction': 101,
    'longAwayVentilationLevel': 102,
    'longAwayTemperatureReduction': 103,
    'temperatureTarget': 135,
}

export let AVAILABLE_ALARMS = {
    1: { name: 'TE5InletAfterHeatExchangerCold', description: 'TE5 inlet after heatexchanger cold' }, // 1=TE5 Tulo LTOn jälkeen kylmä
    2: { name: 'TE10InletAfterHeaterCold', description: 'TE10 inlet after heater cold' }, // 2=TE10 Tulo lämmityspatterin jälkeen kylmä
    3: { name: 'TE10InletAfterHeaterHot', description: 'TE10 inlet after heater hot' }, // 3=TE10 Tulo lämmityspatterin jälkeen kuuma
    4: { name: 'TE20RoomHot', description: 'TE20 room hot' }, // 4=TE20 Huone kuuma
    5: { name: 'TE30OutletCold', description: 'TE30 outlet cold' }, // 5=TE30 Poisto kylmä
    6: { name: 'TE30OutletHot', description: 'TE30 outlet hot' }, // 6=TE30 Poisto kuuma
    7: { name: 'HPFault', description: 'HP fault' }, // 7=HP vika
    8: { name: 'HeaterFault', description: 'Heater fault' }, // 8=SLP vika
    9: { name: 'ReturnWaterCold', description: 'Return water cold' }, // 9=Paluuvesi kylmää
    10: { name: 'LTOFault', description: 'Heatexchanger fault' }, // 10=LTO vika
    11: { name: 'CoolingFault', description: 'Cooling fault' }, // 11=Jäähdytys vika
    12: { name: 'EmergencyStop', description: 'Emergency stop' }, // 12=Hätäseis
    13: { name: 'FireRisk', description: 'Fire risk' }, // 13=Palovaara
    14: { name: 'ServiceReminder', description: 'Service reminder' }, // 14=Huoltomuistutus
    15: { name: 'HeaterPressureSwitch', description: 'Heater pressure switch' }, // 15=SLP painevahti
    16: { name: 'InletFilterDirty', description: 'Inlet filter dirty' }, // 16=Tulosuodatin likainen,
    17: { name: 'OutletFilterDirty', description: 'Outlet filter dirty' }, // 17=Poistosuodatin likainen
    20: { name: 'InletFanPressureAbnomaly', description: 'Inlet fan pressure abnomaly' }, // 20=Tulopuhallin painepoikkeama
    21: { name: 'OutletFanPressureAbnomaly', description: 'Outlet fan pressure abnomaly' }, // 21=Poistopuhallin painepoikkeama
}

const mutex = new Mutex()

export const parseTemperature = (temperature) => {
    if (temperature > 60000) {
        temperature = (65536 - temperature) * -1
    }

    return temperature / 10
}

export const getFlagSummary = async (modbusClient) => {
    let result = await mutex.runExclusive(async () => modbusClient.readCoils(1, 10))
    let summary = {
        'away': result.data[0],
        'longAway': result.data[1],
        'overPressure': result.data[2],
        'maxHeating': result.data[5],
        'maxCooling': result.data[6],
        'manualBoost': result.data[9],
    }

    result = await mutex.runExclusive(async () => modbusClient.readCoils(12, 1))
    summary = {
        ...summary,
        'summerNightCooling': result.data[0]
    }

    return summary
}

export const getFlag = async (modbusClient, flag) => {
    if (AVAILABLE_FLAGS[flag] === undefined) {
        throw new Error('Unknown flag')
    }

    const result = await mutex.runExclusive(async () => modbusClient.readCoils(AVAILABLE_FLAGS[flag], 1))

    return result.data[0]
}

export const setFlag = async (modbusClient, flag, value) => {
    if (AVAILABLE_FLAGS[flag] === undefined) {
        throw new Error('Unknown flag')
    }

    await mutex.runExclusive(async () => modbusClient.writeCoil(AVAILABLE_FLAGS[flag], value))

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

        await mutex.runExclusive(async () => modbusClient.writeCoil(AVAILABLE_FLAGS[mode], false))
    }
}

export const getReadings = async (modbusClient) => {
    let result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(6, 8))
    let readings = {
        'freshAirTemperature': parseTemperature(result.data[0]),
        'supplyAirTemperatureAfterHeatRecovery': parseTemperature(result.data[1]),
        'supplyAirTemperature': parseTemperature(result.data[2]),
        'wasteAirTemperature': parseTemperature(result.data[3]),
        'exhaustAirTemperature': parseTemperature(result.data[4]),
        'exhaustAirTemperatureBeforeHeatRecovery': parseTemperature(result.data[5]),
        'exhaustAirHumidity': result.data[7],
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(29, 7))
    readings = {
        ...readings,
        'heatRecoverySupplySide': result.data[0],
        'heatRecoveryExhaustSide': result.data[1],
        'heatRecoveryTemperatureDifferenceSupplySide': parseTemperature(result.data[2]),
        'heatRecoveryTemperatureDifferenceExhaustSide': parseTemperature(result.data[3]),
        'mean48HourExhaustHumidity': result.data[6],
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(47, 3))
    readings = {
        ...readings,
        'cascadeSp': result.data[0],
        'cascadeP': result.data[1],
        'cascadeI': result.data[2],
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(56, 1))
    readings = {
        ...readings,
        'overPressureTimeLeft': result.data[0],
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(50, 4))
    readings = {
        ...readings,
        'ventilationLevelActual': result.data[0],
        'ventilationLevelTarget': result.data[3],
    }

    return readings
}

export const getSettings = async (modbusClient) => {
    let result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(57, 1))
    let settings = {
        'overPressureDelay': result.data[0]
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(100, 4))
    settings = {
        ...settings,
        'awayVentilationLevel': result.data[0],
        'awayTemperatureReduction': parseTemperature(result.data[1]),
        'longAwayVentilationLevel': result.data[2],
        'longAwayTemperatureReduction': parseTemperature(result.data[3]),
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(135, 1))
    settings = {
        ...settings,
        'temperatureTarget': parseTemperature(result.data[0])
    }

    return settings
}

export const setSetting = async (modbusClient, setting, value) => {
    if (AVAILABLE_SETTINGS[setting] === undefined) {
        throw new Error('Unknown setting')
    }

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
    }

    await mutex.runExclusive(async () => modbusClient.writeRegister(AVAILABLE_SETTINGS[setting], intValue))
}

export const getDeviceInformation = async (modbusClient) => {
    let result = await mutex.runExclusive(async () => modbusClient.readCoils(16, 1))
    let deviceInformation = {
        // EC means DC motors
        'fanType': result.data[0] ? 'EC' : 'AC',
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(154, 1))
    deviceInformation = {
        ...deviceInformation,
        'coolingTypeInstalled': getCoolingTypeName(result.data[0])
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(171, 1))
    deviceInformation = {
        ...deviceInformation,
        'heatingTypeInstalled': getHeatingTypeName(result.data[0])
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(597, 3))
    deviceInformation = {
        ...deviceInformation,
        'familyType': getDeviceFamilyName(result.data[0]),
        'serialNumber': result.data[1],
        'softwareVersion': result.data[2] / 100
    }

    return deviceInformation
}

export const getAlarmHistory = async (modbusClient) => {
    let alarmHistory = []

    const startRegister = 385
    const endRegister = 518
    const alarmOffset = 7;

    for (let register = startRegister; register <= endRegister; register += alarmOffset) {
        const result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(register, alarmOffset))
        const code = result.data[0]
        const state = result.data[1]

        // Skip unset alarm slots and unknown alarm types
        if (AVAILABLE_ALARMS[code] === undefined) {
            continue
        }

        let alarm = Object.assign({}, AVAILABLE_ALARMS[code])
        alarm.state = state
        alarm.date = new Date(`${result.data[2] + 2000}-${result.data[3]}-${result.data[4]} ${result.data[5]}:${result.data[6]}:00`)

        alarmHistory.push(alarm)
    }

    return alarmHistory
}

export const getAlarmStatuses = async (modbusClient, onlyActive = true, distinct = true) => {
    let alarms = []

    if (distinct === true && onlyActive === false) {
        alarms = Object.assign([], AVAILABLE_ALARMS);
    }

    const startRegister = 385
    const endRegister = 518
    const alarmOffset = 7;

    for (let register = startRegister; register <= endRegister; register += alarmOffset) {
        let result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(register, 7))
        let code = result.data[0]
        let state = result.data[1]

        if (AVAILABLE_ALARMS[code] !== undefined && (onlyActive && state > 0 || onlyActive === false)) {
            let alarm = Object.assign({}, AVAILABLE_ALARMS[code])

            alarm.state = state
            alarm.date = new Date(`${result.data[2] + 2000}-${result.data[3]}-${result.data[4]} ${result.data[5]}:${result.data[6]}:00`)

            if (distinct === true) {
                if (alarms[code] !== undefined) {
                    if (alarm.date > alarms[code].date) {
                        alarms[code].date = alarm.date
                    }
                } else {
                    alarms[code] = Object.assign({}, alarm)
                }
            } else {
                alarms.push(alarm)
            }
        }
    }

    return alarms
}

const getDeviceFamilyName = (familyTypeInt) => {
    return [
        'Pingvin',
        'Pandion',
        'Pelican',
        'Pegasos',
        'Pegasos XL',
        'LTR-3',
        'LTR-6̈́',
        'LTR-7',
        'LTR-7 XL'
    ][familyTypeInt] ?? 'unknown'
}

const getCoolingTypeName = (coolingTypeInt) => {
    // 0=Ei jäähdytintä, 1=CW, 2=HP, 3=CG, 4=CX, 5=CX_INV, 6=X2CX, 7=CXBIN, 8=Cooler
    return [
        null,
        'CW',
        'HP',
        'CG',
        'CX',
        'CX_INV',
        'X2CX',
        'CXBIN',
        'Cooler',
    ][coolingTypeInt]
}

const getHeatingTypeName = (heatingTypeInt) => {
    // 0=Ei lämmitintä, 1=VPK, 2=HP, 3=SLP, 4=SLP PWM. Mapping known values to the actual names used on the product,
    // these seem to be internal
    return [
        'ED',
        'EDW',
        'HP',
        'EDE',
        'SLP PWM',
    ][heatingTypeInt] ?? 'unknown'
}

export const createModelNameString = (deviceInformation) => {
    // E.g. LTR-3 eco EDE - CG
    let modelName = deviceInformation.familyType

    if (deviceInformation.fanType === 'EC') {
        modelName += ' eco'
    }

    if (deviceInformation.heatingTypeInstalled !== null) {
        modelName += ` ${deviceInformation.heatingTypeInstalled}`
    }

    if (deviceInformation.coolingTypeInstalled !== null) {
        modelName += ` - ${deviceInformation.coolingTypeInstalled}`
    }

    return modelName
}
