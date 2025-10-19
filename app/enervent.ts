import { ReadRegisterResult } from 'modbus-serial/ModbusRTU'

export const AVAILABLE_MODES: Record<string, number> = {
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
export const MUTUALLY_EXCLUSIVE_MODES: Record<string, number> = {
    'away': 1,
    'longAway': 2,
    'overPressure': 3,
    'maxHeating': 6,
    'maxCooling': 7,
    'manualBoost': 10,
    'eco': 40,
}

export type CoilSettingConfiguration = {
    dataAddress: number
    registerType: 'coil'
}

export type HoldingRegisterSettingConfiguration = {
    dataAddress: number
    registerType: 'holding'
    decimals: number
    registerScale?: number
    min?: number
    max?: number
}

export type SettingConfiguration = CoilSettingConfiguration | HoldingRegisterSettingConfiguration

export const AVAILABLE_SETTINGS: Record<string, SettingConfiguration> = {
    'overPressureDelay': { dataAddress: 57, decimals: 0, registerType: 'holding', min: 0, max: 60 },
    'awayVentilationLevel': { dataAddress: 100, decimals: 0, registerType: 'holding', min: 20, max: 100 },
    'awayTemperatureReduction': { dataAddress: 101, decimals: 0, registerType: 'holding', registerScale: 10 },
    'longAwayVentilationLevel': { dataAddress: 102, decimals: 0, registerType: 'holding', min: 20, max: 100 },
    'longAwayTemperatureReduction': { dataAddress: 103, decimals: 0, registerType: 'holding', registerScale: 10 },
    'temperatureControlMode': { dataAddress: 136, decimals: 0, registerType: 'holding' },
    'temperatureTarget': {
        dataAddress: 135,
        decimals: 1,
        registerType: 'holding',
        registerScale: 10,
        min: 10,
        max: 30,
    },
    'coolingAllowed': { dataAddress: 52, registerType: 'coil' },
    'heatingAllowed': { dataAddress: 54, registerType: 'coil' },
    'awayCoolingAllowed': { dataAddress: 19, registerType: 'coil' },
    'awayHeatingAllowed': { dataAddress: 18, registerType: 'coil' },
    'longAwayCoolingAllowed': { dataAddress: 21, registerType: 'coil' },
    'longAwayHeatingAllowed': { dataAddress: 20, registerType: 'coil' },
    'defrostingAllowed': { dataAddress: 55, registerType: 'coil' },
    'supplyFanOverPressure': { dataAddress: 54, decimals: 0, registerType: 'holding', min: 20, max: 100 },
    'exhaustFanOverPressure': { dataAddress: 55, decimals: 0, registerType: 'holding', min: 20, max: 100 },
}

export enum TemperatureControlState {
    NONE = 0,
    COOLING = 1,
    HEAT_RECOVERY = 2,
    HEATING = 4,
}

export const getTemperatureControlStateValues = (): string[] => {
    const values = Object.values(TemperatureControlState) as string[]

    return values.splice(0, values.length / 2)
}

export type AlarmDescription = {
    name: string
    description: string
    type: number
}

export type AlarmIncident = AlarmDescription & {
    type: number
    state: number
    timestamp: Date
}

export type AlarmStatus = AlarmDescription & {
    state: number
}

export const AVAILABLE_ALARMS: AlarmDescription[] = [
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

export type ModeSummary = {
    away: boolean
    longAway: boolean
    overPressure: boolean
    cookerHood: boolean
    centralVacuumCleaner: boolean
    maxHeating: boolean
    maxCooling: boolean
    manualBoost: boolean
    summerNightCooling: boolean
    eco?: boolean
}

export type Readings = {
    freshAirTemperature: number
    supplyAirTemperatureAfterHeatRecovery: number
    supplyAirTemperature: number
    wasteAirTemperature: number
    exhaustAirTemperature: number
    exhaustAirTemperatureBeforeHeatRecovery: number
    exhaustAirHumidity: number
    heatRecoverySupplySide: number
    heatRecoveryExhaustSide: number
    heatRecoveryTemperatureDifferenceSupplySide: number
    heatRecoveryTemperatureDifferenceExhaustSide: number
    mean48HourExhaustHumidity: number
    cascadeSp: number
    cascadeP: number
    cascadeI: number
    overPressureTimeLeft: number
    ventilationLevelActual: number
    ventilationLevelTarget: number
    roomTemperatureAvg?: number
    controlPanel1Temperature?: number
    controlPanel2Temperature?: number
    supplyFanSpeed?: number
    exhaustFanSpeed?: number
    returnWaterTemperature?: number
    temperatureControlState: string
}

export type Settings = {
    overPressureDelay: number
    awayVentilationLevel: number
    awayTemperatureReduction: number
    longAwayVentilationLevel: number
    longAwayTemperatureReduction: number
    temperatureTarget: number
    temperatureControlMode: number
    coolingAllowed?: boolean
    heatingAllowed?: boolean
    awayCoolingAllowed?: boolean
    awayHeatingAllowed?: boolean
    longAwayCoolingAllowed?: boolean
    longAwayHeatingAllowed?: boolean
    defrostingAllowed: boolean
    supplyFanOverPressure: number
    exhaustFanOverPressure: number
}

export type DeviceInformation = {
    softwareVersion: number
    automationType: AutomationType
    fanType: 'EC' | 'AC'
    coolingTypeInstalled: string | null
    heatingTypeInstalled: string | null
    modelType: string
    serialNumber: number
    modelName: string
    modbusAddress: number
}

export enum SensorType {
    NONE = 'NONE',
    CO2 = 'CO2',
    RH = 'RH',
    ROOM_TEMP = 'ROOM_TEMP',
}

type AnalogInput = {
    type: number
    sensorType: SensorType
    name?: string
    description?: string
}

export const ANALOG_INPUT_SENSOR_TYPES: AnalogInput[] = [
    // Skip sensor types we can't handle
    { type: 0, sensorType: SensorType.NONE },
    { type: 1, sensorType: SensorType.CO2, name: 'analogInputCo21', description: 'CO2 #1' },
    { type: 2, sensorType: SensorType.CO2, name: 'analogInputCo22', description: 'CO2 #1' },
    { type: 3, sensorType: SensorType.CO2, name: 'analogInputCo23', description: 'CO2 #1' },
    { type: 4, sensorType: SensorType.RH, name: 'analogInputHumidity1', description: 'RH #1' },
    { type: 5, sensorType: SensorType.RH, name: 'analogInputHumidity2', description: 'RH #1' },
    { type: 6, sensorType: SensorType.RH, name: 'analogInputHumidity3', description: 'RH #1' },
    {
        type: 8,
        sensorType: SensorType.ROOM_TEMP,
        name: 'analogInputRoomTemperature1',
        description: 'Room temperature #1',
    },
    {
        type: 9,
        sensorType: SensorType.ROOM_TEMP,
        name: 'analogInputRoomTemperature2',
        description: 'Room temperature #1',
    },
    {
        type: 10,
        sensorType: SensorType.ROOM_TEMP,
        name: 'analogInputRoomTemperature3',
        description: 'Room temperature #1',
    },
]

type AnalogSensorReadings = Record<string, number>

export enum HeatingType {
    ED = 'ED/MD',
    EDW = 'EDW/MDW',
    EDX = 'EDX/MDX',
    EDE = 'EDE/MDE',
}

export enum AutomationType {
    LEGACY_EDA = 'LEGACY_EDA',
    MD = 'MD',
    EDA = 'EDA',
}

export const determineAutomationType = (version: number): AutomationType => {
    if (version > 190 && version <= 201) {
        return AutomationType.LEGACY_EDA
    } else if (version < 190) {
        return AutomationType.MD
    } else {
        return AutomationType.EDA
    }
}

export const parseTemperature = (temperature: number): number => {
    if (temperature > 60000) {
        temperature = (65536 - temperature) * -1
    }

    return temperature / 10
}

export const getDeviceFamilyName = (familyType: number): string => {
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
        ][familyType] || 'unknown'
    )
}

export const getCoolingTypeName = (coolingType: number): string | null => {
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
    ][coolingType]
}

export const getAutomationAndHeatingTypeName = (heatingType: number): string => {
    // 0=Ei lämmitintä, 1=VPK, 2=HP, 3=SLP, 4=SLP PWM
    // E prefix is used for units with EDA automation
    // M prefix is used for units with MD automation
    return (
        [
            HeatingType.ED, // prettier-hack
            HeatingType.EDW,
            HeatingType.EDX,
            HeatingType.EDE,
        ][heatingType] || 'unknown'
    )
}

export const createModelNameString = (deviceInformation: Partial<DeviceInformation>): string => {
    // E.g. LTR-3 eco EDE/MDE - CG
    let modelName = deviceInformation.modelType as string

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

export const parseAlarmTimestamp = (result: ReadRegisterResult) => {
    return new Date(result.data[2] + 2000, result.data[3] - 1, result.data[4], result.data[5], result.data[6])
}

export const parseStateBitField = (state: number) => {
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

export const hasRoomTemperatureSensor = (sensorTypesResult: ReadRegisterResult): boolean => {
    for (let i = 0; i < 6; i++) {
        const sensor = ANALOG_INPUT_SENSOR_TYPES.find((sensor) => sensor.type === sensorTypesResult.data[i])

        if (sensor?.sensorType === SensorType.ROOM_TEMP) {
            return true
        }
    }

    return false
}

export const parseAnalogSensors = (
    sensorTypesResult: ReadRegisterResult,
    sensorValuesResult: ReadRegisterResult
): AnalogSensorReadings => {
    const sensorReadings: AnalogSensorReadings = {}

    for (let i = 0; i < 6; i++) {
        const sensor = ANALOG_INPUT_SENSOR_TYPES.find((sensor) => sensor.type === sensorTypesResult.data[i])

        switch (sensor?.sensorType) {
            // Use raw value
            case SensorType.CO2:
            case SensorType.RH:
                sensorReadings[sensor.name!] = sensorValuesResult.data[i]
                break
            // Parse as temperature
            case SensorType.ROOM_TEMP:
                sensorReadings[sensor.name!] = parseTemperature(sensorValuesResult.data[i])
                break
        }
    }

    return sensorReadings
}
