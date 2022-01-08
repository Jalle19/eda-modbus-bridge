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

const AVAILABLE_SETTINGS = {
    'overPressureDelay': 57,
    'awayVentilationLevel': 100,
    'awayTemperatureReduction': 101,
    'longAwayVentilationLevel': 102,
    'longAwayTemperatureReduction': 103,
    'temperatureTarget': 135,
}

const mutex = new Mutex()

const parseTemperature = (temperature) => {
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

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(50, 1))
    readings = {
        ...readings,
        'ventilationLevelActual': result.data[0],
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
        'fanType': result.data[0],
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(136, 1))
    deviceInformation = {
        ...deviceInformation,
        'heatingConfigurationMode': result.data[0]
    }

    result = await mutex.runExclusive(async () => modbusClient.readHoldingRegisters(597, 3))
    deviceInformation = {
        ...deviceInformation,
        'familyType': result.data[0],
        'serialNumber': result.data[1],
        'softwareVersion': result.data[2]
    }

    return deviceInformation
}
