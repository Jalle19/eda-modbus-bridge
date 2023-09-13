export const AVAILABLE_FLAGS = {
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
}

export const AVAILABLE_ALARMS = {
    // Alarm number
    // Name and descr based on Enervent EN EDA Modbus regirsters: 3x0385
    // Waste air is used in some places where we don't care about if it's before (Extract)
    // or after (Exhaust) the HRC. Filter sits before HRC, and fans after HRC.

    1: { name: 'TE5SupplyAirAfterHRCold', description: 'TE5 Supply air after heat recovery cold' },
    2: { name: 'TE10SupplyAirAfterHeaterCold', description: 'TE10 Supply air after heater cold' },
    3: { name: 'TE10SupplyAirAfterHeaterHot', description: 'TE10 Supply air after heater hot' },
    4: { name: 'TE20RoomTempHot', description: 'TE20 Room temperature hot' },
    5: { name: 'TE30ExtractAirCold', description: 'TE30 Extract air cold' },
    6: { name: 'TE30ExtractAirHot', description: 'TE30 Extract air hot' },
    7: { name: 'HPError', description: 'Heatpump' },
    8: { name: 'EHError', description: 'Electrical heater' },
    9: { name: 'ReturnWaterCold', description: 'Return water cold' },
    10: { name: 'HRError', description: 'Heat recovery' },
    11: { name: 'CoolingError', description: 'Cooling' },
    12: { name: 'EmergencyStop', description: 'Emergency stop' },
    13: { name: 'FireRisk', description: 'Fire risk' },
    14: { name: 'ServiceReminder', description: 'Service reminder' },
    15: { name: 'EHPDA', description: 'Electrical heater pressure switch' },
    16: { name: 'SupplyFilterDirty', description: 'Supply filter dirty' },
    17: { name: 'ExtractFilterDirty', description: 'Waste filter dirty' },
    20: { name: 'SupplyFanPressureError', description: 'Supply fan pressure' },
    21: { name: 'ExtractFanPressureError', description: 'Waste fan pressure' },
}

export const SENSOR_TYPE_NONE = 'NONE'
export const SENSOR_TYPE_CO2 = 'CO2'
export const SENSOR_TYPE_RH = 'RH'
export const SENSOR_TYPE_ROOM_TEMP = 'ROOM_TEMP'

// 0=NA, 1=CO2_1, 2=CO2_2, 3=CO2_3, 4=RH_1, 5=RH_2, 6=RH_3, 7=OUT_TERM, 8=ROOM_TERM_1,
// 9=ROOM_TERM_2, 10=ROOM_TERM_3, 11=TEMP_SP, 12=Time relay, 13=External heating disable, 14=External cooling disable,
// 15=PDE10, 16=PDE30
export const ANALOG_INPUT_SENSOR_TYPES = {
    // Skip sensor types we can't handle
    0: { type: SENSOR_TYPE_NONE },
    1: { type: SENSOR_TYPE_CO2, name: 'analogInputCo21', description: 'CO2 #1' },
    2: { type: SENSOR_TYPE_CO2, name: 'analogInputCo22', description: 'CO2 #1' },
    3: { type: SENSOR_TYPE_CO2, name: 'analogInputCo23', description: 'CO2 #1' },
    4: { type: SENSOR_TYPE_RH, name: 'analogInputHumidity1', description: 'RH #1' },
    5: { type: SENSOR_TYPE_RH, name: 'analogInputHumidity2', description: 'RH #1' },
    6: { type: SENSOR_TYPE_RH, name: 'analogInputHumidity3', description: 'RH #1' },
    8: { type: SENSOR_TYPE_ROOM_TEMP, name: 'analogInputRoomTemperature1', description: 'Room temperature #1' },
    9: { type: SENSOR_TYPE_ROOM_TEMP, name: 'analogInputRoomTemperature2', description: 'Room temperature #1' },
    10: { type: SENSOR_TYPE_ROOM_TEMP, name: 'analogInputRoomTemperature3', description: 'Room temperature #1' },
}
