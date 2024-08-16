export const AVAILABLE_MODES = {
    'away': 1,
    'longAway': 2,
    'overPressure': 3,
    'cookerHood': 4,
    'centralVacuumCleaner': 5,
    'maxHeating': 6,
    'maxCooling': 7,
    'manualBoost': 10,
    'summerNightCooling': 12,
    'eco': 40,
}

// Modes that can only be true one at a time (mapped to their coil number)
export const MUTUALLY_EXCLUSIVE_MODES = {
    'away': 1,
    'longAway': 2,
    'overPressure': 3,
    'maxHeating': 6,
    'maxCooling': 7,
    'manualBoost': 10,
    'eco': 40,
}

export const AVAILABLE_SETTINGS = {
    'overPressureDelay': 57,
    'awayVentilationLevel': 100,
    'awayTemperatureReduction': 101,
    'longAwayVentilationLevel': 102,
    'longAwayTemperatureReduction': 103,
    'temperatureTarget': 135,
    'coolingAllowed': 52,
    'heatingAllowed': 54,
    'awayCoolingAllowed': 19,
    'awayHeatingAllowed': 18,
    'longAwayCoolingAllowed': 21,
    'longAwayHeatingAllowed': 20,
    'defrostingAllowed': 55,
}

export const AVAILABLE_ALARMS = [
    { name: 'TE5SupplyAirAfterHRCold', description: 'TE5 Supply air after heat recovery cold', type: 1 },
    { name: 'TE10SupplyAirAfterHeaterCold', description: 'TE10 Supply air after heater cold', type: 2 },
    { name: 'TE10SupplyAirAfterHeaterHot', description: 'TE10 Supply air after heater hot', type: 3 },
    { name: 'TE20RoomTempHot', description: 'TE20 Room temperature hot', type: 4 },
    { name: 'TE30ExtractAirCold', description: 'TE30 Extract air cold', type: 5 },
    { name: 'TE30ExtractAirHot', description: 'TE30 Extract air hot', type: 6 },
    { name: 'HPError', description: 'Heatpump', type: 7 },
    { name: 'EHError', description: 'Electrical heater', type: 8 },
    { name: 'ReturnWaterCold', description: 'Return water cold', type: 9 },
    { name: 'HRError', description: 'Heat recovery', type: 10 },
    { name: 'CoolingError', description: 'Cooling', type: 11 },
    { name: 'EmergencyStop', description: 'Emergency stop', type: 12 },
    { name: 'FireRisk', description: 'Fire risk', type: 13 },
    { name: 'ServiceReminder', description: 'Service reminder', type: 14 },
    { name: 'EHPDA', description: 'Electrical heater pressure switch', type: 15 },
    { name: 'SupplyFilterDirty', description: 'Supply filter dirty', type: 16 },
    { name: 'ExtractFilterDirty', description: 'Waste filter dirty', type: 17 },
    { name: 'SupplyFanPressureError', description: 'Supply fan pressure', type: 20 },
    { name: 'ExtractFanPressureError', description: 'Waste fan pressure', type: 21 },
]

export const SENSOR_TYPE_NONE = 'NONE'
export const SENSOR_TYPE_CO2 = 'CO2'
export const SENSOR_TYPE_RH = 'RH'
export const SENSOR_TYPE_ROOM_TEMP = 'ROOM_TEMP'

export const ANALOG_INPUT_SENSOR_TYPES = [
    // Skip sensor types we can't handle
    { type: 0, sensorType: SENSOR_TYPE_NONE },
    { type: 1, sensorType: SENSOR_TYPE_CO2, name: 'analogInputCo21', description: 'CO2 #1' },
    { type: 2, sensorType: SENSOR_TYPE_CO2, name: 'analogInputCo22', description: 'CO2 #1' },
    { type: 3, sensorType: SENSOR_TYPE_CO2, name: 'analogInputCo23', description: 'CO2 #1' },
    { type: 4, sensorType: SENSOR_TYPE_RH, name: 'analogInputHumidity1', description: 'RH #1' },
    { type: 5, sensorType: SENSOR_TYPE_RH, name: 'analogInputHumidity2', description: 'RH #1' },
    { type: 6, sensorType: SENSOR_TYPE_RH, name: 'analogInputHumidity3', description: 'RH #1' },
    {
        type: 8,
        sensorType: SENSOR_TYPE_ROOM_TEMP,
        name: 'analogInputRoomTemperature1',
        description: 'Room temperature #1',
    },
    {
        type: 9,
        sensorType: SENSOR_TYPE_ROOM_TEMP,
        name: 'analogInputRoomTemperature2',
        description: 'Room temperature #1',
    },
    {
        type: 10,
        sensorType: SENSOR_TYPE_ROOM_TEMP,
        name: 'analogInputRoomTemperature3',
        description: 'Room temperature #1',
    },
]

export const AUTOMATION_TYPE_LEGACY_EDA = 'LEGACY_EDA'
export const AUTOMATION_TYPE_EDA = 'EDA'
export const AUTOMATION_TYPE_MD = 'MD'

export const determineAutomationType = (versionInt) => {
    if (versionInt > 190 && versionInt <= 201) {
        return AUTOMATION_TYPE_LEGACY_EDA
    } else if (versionInt < 190) {
        return AUTOMATION_TYPE_MD
    } else {
        return AUTOMATION_TYPE_EDA
    }
}

export const parseTemperature = (temperature) => {
    if (temperature > 60000) {
        temperature = (65536 - temperature) * -1
    }

    return temperature / 10
}

export const getDeviceFamilyName = (familyTypeInt) => {
    return (
        [
            'Pingvin', // prettier-hack
            'Pandion',
            'Pelican',
            'Pegasos',
            'Pegasos XL',
            'LTR-3',
            'LTR-6',
            'LTR-7',
            'LTR-7 XL',
        ][familyTypeInt] || 'unknown'
    )
}

export const getCoolingTypeName = (coolingTypeInt) => {
    // 0=Ei jäähdytintä, 1=CW, 2=HP, 3=CG, 4=CX, 5=CX_INV, 6=X2CX, 7=CXBIN, 8=Cooler
    return [
        null,
        'CW', // prettier-hack
        'HP',
        'CG',
        'CX',
        'CX_INV',
        'X2CX',
        'CXBIN',
        'Cooler',
    ][coolingTypeInt]
}

export const getAutomationAndHeatingTypeName = (heatingTypeInt) => {
    // 0=Ei lämmitintä, 1=VPK, 2=HP, 3=SLP, 4=SLP PWM
    // E prefix is used for units with EDA automation
    // M prefix is used for units with MD automation
    return (
        [
            'ED/MD', // prettier-hack
            'EDW/MDW',
            'EDX/MDX',
            'EDE/MDE',
        ][heatingTypeInt] || 'unknown'
    )
}

export const createModelNameString = (deviceInformation) => {
    // E.g. LTR-3 eco EDE/MDE - CG
    let modelName = deviceInformation.modelType

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

export const parseAlarmTimestamp = (result) => {
    return new Date(result.data[2] + 2000, result.data[3] - 1, result.data[4], result.data[5], result.data[6])
}

export const parseStateBitField = (state) => {
    return {
        'normal': state === 0,
        'maxCooling': Boolean(state & 1),
        'maxHeating': Boolean(state & 2),
        'emergencyStop': Boolean(state & 4),
        'stop': Boolean(state & 8),
        'away': Boolean(state & 16),
        'longAway': Boolean(state & 32),
        'temperatureBoost': Boolean(state & 64),
        'co2Boost': Boolean(state & 128),
        'humidityBoost': Boolean(state & 256),
        'manualBoost': Boolean(state & 512),
        'overPressure': Boolean(state & 1024),
        'cookerHood': Boolean(state & 2048),
        'centralVacuumCleaner': Boolean(state & 4096),
        'heaterCooldown': Boolean(state & 8192),
        'summerNightCooling': Boolean(state & 16384),
        'defrosting': Boolean(state & 32768),
    }
}

export const hasRoomTemperatureSensor = (sensorTypesResult) => {
    for (let i = 0; i < 6; i++) {
        const sensor = ANALOG_INPUT_SENSOR_TYPES.find((sensor) => sensor.type === sensorTypesResult.data[i])

        if (sensor?.sensorType === SENSOR_TYPE_ROOM_TEMP) {
            return true
        }
    }

    return false
}

export const parseAnalogSensors = (sensorTypesResult, sensorValuesResult) => {
    const sensorReadings = {}

    for (let i = 0; i < 6; i++) {
        const sensor = ANALOG_INPUT_SENSOR_TYPES.find((sensor) => sensor.type === sensorTypesResult.data[i])

        switch (sensor?.sensorType) {
            // Use raw value
            case SENSOR_TYPE_CO2:
            case SENSOR_TYPE_RH:
                sensorReadings[sensor.name] = sensorValuesResult.data[i]
                break
            // Parse as temperature
            case SENSOR_TYPE_ROOM_TEMP:
                sensorReadings[sensor.name] = parseTemperature(sensorValuesResult.data[i])
                break
        }
    }

    return sensorReadings
}
