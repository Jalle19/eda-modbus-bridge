import { getDeviceInformation } from './modbus'
import {
    TOPIC_NAME_STATUS,
    TOPIC_PREFIX_ALARM,
    TOPIC_PREFIX_DEVICE_STATE,
    TOPIC_PREFIX_MODE,
    TOPIC_PREFIX_READINGS,
    TOPIC_PREFIX_SETTINGS,
} from './mqtt'
import { createLogger } from './logger'
import {
    AlarmDescription,
    HeatingType,
    AutomationType,
    AVAILABLE_ALARMS,
    createModelNameString,
    DeviceInformation,
} from './enervent'
import ModbusRTU from 'modbus-serial'
import { MqttClient } from 'mqtt'

type EntityConfiguration = object

const logger = createLogger('homeassistant')

export const configureMqttDiscovery = async (modbusClient: ModbusRTU, mqttClient: MqttClient) => {
    // Build information about the ventilation unit. The "deviceIdentifier" is used as <node_id> in discovery topic
    // names, so it must match [a-zA-Z0-9_-].
    const modbusDeviceInformation = await getDeviceInformation(modbusClient)
    const softwareVersion = modbusDeviceInformation.softwareVersion
    const automationType = modbusDeviceInformation.automationType
    const heatingType = modbusDeviceInformation.heatingTypeInstalled
    const modelName = createModelNameString(modbusDeviceInformation)
    const deviceIdentifier = createDeviceIdentifierString(modbusDeviceInformation)

    // The "device" object that is part of each sensor's configuration payload
    const mqttDeviceInformation = {
        'identifiers': deviceIdentifier,
        'name': `Enervent ${modelName}`,
        'sw_version': softwareVersion,
        'model': modelName,
        'manufacturer': 'Enervent',
    }

    const configurationBase = {
        'platform': 'mqtt',
        'availability_topic': TOPIC_NAME_STATUS,
        'device': mqttDeviceInformation,
    }

    // Sensor configuration
    const sensorConfigurationMap = {
        // Temperature sensors
        'freshAirTemperature': createTemperatureSensorConfiguration(
            configurationBase,
            'freshAirTemperature',
            'Outside temperature'
        ),
        'supplyAirTemperature': createTemperatureSensorConfiguration(
            configurationBase,
            'supplyAirTemperature',
            'Supply air temperature'
        ),
        'supplyAirTemperatureAfterHeatRecovery': createTemperatureSensorConfiguration(
            configurationBase,
            'supplyAirTemperatureAfterHeatRecovery',
            'Supply air temperature (after heat recovery)'
        ),
        'exhaustAirTemperature': createTemperatureSensorConfiguration(
            configurationBase,
            'exhaustAirTemperature',
            'Exhaust air temperature'
        ),
        'exhaustAirTemperatureBeforeHeatRecovery': createTemperatureSensorConfiguration(
            configurationBase,
            'exhaustAirTemperatureBeforeHeatRecovery',
            'Exhaust air temperature (before heat recovery)',
            { 'enabled_by_default': heatingType !== HeatingType.EDW }
        ),
        'returnWaterTemperature': createTemperatureSensorConfiguration(
            configurationBase,
            'returnWaterTemperature',
            'Return water temperature',
            { 'enabled_by_default': heatingType === HeatingType.EDW }
        ),
        'wasteAirTemperature': createTemperatureSensorConfiguration(
            configurationBase,
            'wasteAirTemperature',
            'Waste air temperature'
        ),
        // Humidity sensors
        'exhaustAirHumidity': createHumiditySensorConfiguration(
            configurationBase,
            'exhaustAirHumidity',
            'Exhaust air humidity'
        ),
        'mean48HourExhaustHumidity': createHumiditySensorConfiguration(
            configurationBase,
            'mean48HourExhaustHumidity',
            'Exhaust air humidity (48h mean)'
        ),
        // Generic sensors (percentages, minutes left, cascade values)
        'heatRecoverySupplySide': createSensorConfiguration(
            configurationBase,
            'heatRecoverySupplySide',
            'Heat recovery (supply)',
            { 'unit_of_measurement': '%' }
        ),
        'heatRecoveryExhaustSide': createSensorConfiguration(
            configurationBase,
            'heatRecoveryExhaustSide',
            'Heat recovery (exhaust)',
            { 'unit_of_measurement': '%' }
        ),
        'cascadeSp': createSensorConfiguration(configurationBase, 'cascadeSp', 'Cascade setpoint'),
        'cascadeP': createSensorConfiguration(configurationBase, 'cascadeP', 'Cascade P-value'),
        'cascadeI': createSensorConfiguration(configurationBase, 'cascadeI', 'Cascade I-value'),
        'overPressureTimeLeft': createSensorConfiguration(
            configurationBase,
            'overPressureTimeLeft',
            'Overpressure time left',
            { 'unit_of_measurement': 'minutes' }
        ),
        'ventilationLevelTarget': createSensorConfiguration(
            configurationBase,
            'ventilationLevelTarget',
            'Ventilation level (target)',
            { 'unit_of_measurement': '%' }
        ),
        'ventilationLevelActual': createSensorConfiguration(
            configurationBase,
            'ventilationLevelActual',
            'Ventilation level (actual)',
            { 'unit_of_measurement': '%' }
        ),
        // Optional sensors. These are not available for all users, so the entities are disabled by default.
        'roomTemperatureAvg': createTemperatureSensorConfiguration(
            configurationBase,
            'roomTemperatureAvg',
            'Room temperature (average)',
            { 'enabled_by_default': false }
        ),
        'analogInputCo21': createSensorConfiguration(configurationBase, 'analogInputCo21', 'CO2 #1', {
            'enabled_by_default': false,
        }),
        'analogInputCo22': createSensorConfiguration(configurationBase, 'analogInputCo22', 'CO2 #2', {
            'enabled_by_default': false,
        }),
        'analogInputCo23': createSensorConfiguration(configurationBase, 'analogInputCo23', 'CO2 #3', {
            'enabled_by_default': false,
        }),
        'analogInputHumidity1': createHumiditySensorConfiguration(configurationBase, 'analogInputHumidity1', 'RH #1', {
            'enabled_by_default': false,
        }),
        'analogInputHumidity2': createHumiditySensorConfiguration(configurationBase, 'analogInputHumidity2', 'RH #2', {
            'enabled_by_default': false,
        }),
        'analogInputHumidity3': createHumiditySensorConfiguration(configurationBase, 'analogInputHumidity3', 'RH #3', {
            'enabled_by_default': false,
        }),
        'analogRoomTemperature1': createTemperatureSensorConfiguration(
            configurationBase,
            'analogRoomTemperature1',
            'Room temperature #1',
            { 'enabled_by_default': false }
        ),
        'analogRoomTemperature2': createTemperatureSensorConfiguration(
            configurationBase,
            'analogRoomTemperature2',
            'Room temperature #2',
            { 'enabled_by_default': false }
        ),
        'analogRoomTemperature3': createTemperatureSensorConfiguration(
            configurationBase,
            'analogRoomTemperature3',
            'Room temperature #3',
            { 'enabled_by_default': false }
        ),
        // Optional sensors that are only guaranteed to work on MD automation units
        'controlPanel1Temperature': createTemperatureSensorConfiguration(
            configurationBase,
            'controlPanel1Temperature',
            'Control panel #1 temperature',
            { 'enabled_by_default': automationType === AutomationType.MD }
        ),
        'controlPanel2Temperature': createTemperatureSensorConfiguration(
            configurationBase,
            'controlPanel2Temperature',
            'Control panel #2 temperature',
            { 'enabled_by_default': automationType === AutomationType.MD }
        ),
        'supplyFanSpeed': createSensorConfiguration(configurationBase, 'supplyFanSpeed', 'Supply fan speed', {
            'unit_of_measurement': '%',
            'enabled_by_default': automationType === AutomationType.MD,
        }),
        'exhaustFanSpeed': createSensorConfiguration(configurationBase, 'exhaustFanSpeed', 'Exhaust fan speed', {
            'unit_of_measurement': '%',
            'enabled_by_default': automationType === AutomationType.MD,
        }),
    }

    // Configurable numbers
    const numberConfigurationMap = {
        'overPressureDelay': createNumberConfiguration(configurationBase, 'overPressureDelay', 'Overpressure delay', {
            'min': 1,
            'max': 60,
            'unit_of_measurement': 'minutes',
        }),
        'awayVentilationLevel': createNumberConfiguration(
            configurationBase,
            'awayVentilationLevel',
            'Away ventilation level',
            {
                'min': 1,
                'max': 100,
                'unit_of_measurement': '%',
            }
        ),
        'awayTemperatureReduction': createNumberConfiguration(
            configurationBase,
            'awayTemperatureReduction',
            'Away temperature reduction',
            {
                'min': 0,
                'max': 20,
                'unit_of_measurement': '°C',
            }
        ),
        'longAwayVentilationLevel': createNumberConfiguration(
            configurationBase,
            'longAwayVentilationLevel',
            'Long away ventilation level',
            {
                'min': 1,
                'max': 100,
                'unit_of_measurement': '%',
            }
        ),
        'longAwayTemperatureReduction': createNumberConfiguration(
            configurationBase,
            'longAwayTemperatureReduction',
            'Long away temperature reduction',
            {
                'min': 0,
                'max': 20,
                'unit_of_measurement': '°C',
            }
        ),
        'temperatureTarget': createNumberConfiguration(configurationBase, 'temperatureTarget', 'Temperature target', {
            'min': 0,
            'max': 30,
            'unit_of_measurement': '°C',
        }),
        'supplyFanOverPressure': createNumberConfiguration(
            configurationBase,
            'supplyFanOverPressure',
            'Supply fan speed (during overpressure)',
            {
                min: 20,
                max: 100,
                'unit_of_measurement': '%',
            }
        ),
        'exhaustFanOverPressure': createNumberConfiguration(
            configurationBase,
            'exhaustFanOverPressure',
            'Exhaust fan speed (during overpressure)',
            {
                min: 20,
                max: 100,
                'unit_of_measurement': '%',
            }
        ),
    }

    // Configurable switches
    const switchConfigurationMap = {
        // Mode switches
        'away': createModeSwitchConfiguration(configurationBase, 'away', 'Away'),
        'longAway': createModeSwitchConfiguration(configurationBase, 'longAway', 'Long away'),
        'overPressure': createModeSwitchConfiguration(configurationBase, 'overPressure', 'Overpressure'),
        'maxHeating': createModeSwitchConfiguration(configurationBase, 'maxHeating', 'Max heating'),
        'maxCooling': createModeSwitchConfiguration(configurationBase, 'maxCooling', 'Max cooling'),
        'manualBoost': createModeSwitchConfiguration(configurationBase, 'manualBoost', 'Manual boost'),
        'summerNightCooling': createModeSwitchConfiguration(
            configurationBase,
            'summerNightCooling',
            'Summer night cooling'
        ),
        'eco': createModeSwitchConfiguration(
            configurationBase,
            'eco',
            'Eco',
            // Not supported by some units
            { 'enabled_by_default': automationType === AutomationType.MD }
        ),
        // Settings switches
        'coolingAllowed': createSettingSwitchConfiguration(
            configurationBase,
            'coolingAllowed',
            'Cooling allowed',
            // Not supported by some units
            { 'enabled_by_default': automationType !== AutomationType.LEGACY_EDA }
        ),
        'heatingAllowed': createSettingSwitchConfiguration(
            configurationBase,
            'heatingAllowed',
            'Heating allowed',
            // Not supported by some units
            { 'enabled_by_default': automationType !== AutomationType.LEGACY_EDA }
        ),
        'awayCoolingAllowed': createSettingSwitchConfiguration(
            configurationBase,
            'awayCoolingAllowed',
            'Cooling allowed (away mode)',
            // Not supported by some units
            { 'enabled_by_default': automationType !== AutomationType.LEGACY_EDA }
        ),
        'awayHeatingAllowed': createSettingSwitchConfiguration(
            configurationBase,
            'awayHeatingAllowed',
            'Heating allowed (away mode)',
            // Not supported by some units
            { 'enabled_by_default': automationType !== AutomationType.LEGACY_EDA }
        ),
        'longAwayCoolingAllowed': createSettingSwitchConfiguration(
            configurationBase,
            'longAwayCoolingAllowed',
            'Cooling allowed (long away mode)',
            // Not supported by some units
            { 'enabled_by_default': automationType !== AutomationType.LEGACY_EDA }
        ),
        'longAwayHeatingAllowed': createSettingSwitchConfiguration(
            configurationBase,
            'longAwayHeatingAllowed',
            'Heating allowed (long away mode)',
            // Not supported by some units
            { 'enabled_by_default': automationType !== AutomationType.LEGACY_EDA }
        ),
        'defrostingAllowed': createSettingSwitchConfiguration(
            configurationBase,
            'defrostingAllowed',
            'Defrosting allowed'
        ),
    }

    // Binary sensors for alarms
    let binarySensorConfigurationMap = {}

    for (const alarm of AVAILABLE_ALARMS) {
        binarySensorConfigurationMap = {
            ...binarySensorConfigurationMap,
            [alarm.name]: createAlarmConfiguration(configurationBase, alarm),
        }
    }

    // Binary sensors for device state
    binarySensorConfigurationMap = {
        ...binarySensorConfigurationMap,
        'normal': createDeviceStateConfiguration(configurationBase, 'normal', 'Normal'),
        'maxCooling': createDeviceStateConfiguration(configurationBase, 'maxCooling', 'Max cooling'),
        'maxHeating': createDeviceStateConfiguration(configurationBase, 'maxHeating', 'Max heating'),
        'emergencyStop': createDeviceStateConfiguration(configurationBase, 'emergencyStop', 'Emergency stop'),
        'stop': createDeviceStateConfiguration(configurationBase, 'stop', 'Stopped'),
        'away': createDeviceStateConfiguration(configurationBase, 'away', 'Away'),
        'longAway': createDeviceStateConfiguration(configurationBase, 'longAway', 'Long away'),
        'temperatureBoost': createDeviceStateConfiguration(configurationBase, 'temperatureBoost', 'Temperature boost'),
        'co2Boost': createDeviceStateConfiguration(configurationBase, 'co2Boost', 'CO2 boost'),
        'humidityBoost': createDeviceStateConfiguration(configurationBase, 'humidityBoost', 'Humidity boost'),
        'manualBoost': createDeviceStateConfiguration(configurationBase, 'manualBoost', 'Manual boost'),
        'overPressure': createDeviceStateConfiguration(configurationBase, 'overPressure', 'Overpressure'),
        'cookerHood': createDeviceStateConfiguration(configurationBase, 'cookerHood', 'Cooker hood'),
        'centralVacuumCleaner': createDeviceStateConfiguration(
            configurationBase,
            'centralVacuumCleaner',
            'Central vacuum cleaner'
        ),
        'heaterCooldown': createDeviceStateConfiguration(configurationBase, 'heaterCooldown', 'Heater cooldown'),
        'summerNightCooling': createDeviceStateConfiguration(
            configurationBase,
            'summerNightCooling',
            'Summer night cooling'
        ),
        'defrosting': createDeviceStateConfiguration(configurationBase, 'defrosting', 'Defrosting'),
    }

    // Button for acknowledging alarms
    const buttonConfigurationMap = {
        'acknowledgeAlarm': createButtonConfiguration(
            configurationBase,
            'acknowledgeAlarm',
            'Acknowledge newest alarm'
        ),
    }

    // Select for changing temperature control mode
    const selectConfigurationMap = {
        'temperatureControlMode': createSelectConfiguration(
            configurationBase,
            'temperatureControlMode',
            'Temperature control mode',
            ['Supply control', 'Exhaust control', 'Room control']
        ),
    }

    // Final map that describes everything we want to be auto-discovered
    const configurationMap = {
        'sensor': sensorConfigurationMap,
        'number': numberConfigurationMap,
        'switch': switchConfigurationMap,
        'binary_sensor': binarySensorConfigurationMap,
        'button': buttonConfigurationMap,
        'select': selectConfigurationMap,
    }

    // Publish configurations
    for (const [entityType, entityConfigurationMap] of Object.entries(configurationMap)) {
        for (const [entityName, configuration] of Object.entries(entityConfigurationMap)) {
            const configurationTopicName = `homeassistant/${entityType}/${deviceIdentifier}/${entityName}/config`

            // "retain" is used so that the entities will be available immediately after a Home Assistant restart
            logger.debug(`Publishing Home Assistant auto-discovery configuration for ${entityType} "${entityName}"...`)
            await mqttClient.publishAsync(configurationTopicName, JSON.stringify(configuration), {
                retain: true,
            })
        }
    }
}

export const createDeviceIdentifierString = (modbusDeviceInformation: Partial<DeviceInformation>) => {
    return `enervent-${modbusDeviceInformation.modelType}-${modbusDeviceInformation.fanType}`.toLowerCase()
}

const createTemperatureSensorConfiguration = (
    configurationBase: EntityConfiguration,
    readingName: string,
    entityName: string,
    extraProperties?: EntityConfiguration
): EntityConfiguration => {
    if (!extraProperties) {
        extraProperties = {}
    }

    return createSensorConfiguration(configurationBase, readingName, entityName, {
        'device_class': 'temperature',
        'unit_of_measurement': '°C',
        ...extraProperties,
    })
}

const createHumiditySensorConfiguration = (
    configurationBase: EntityConfiguration,
    readingName: string,
    entityName: string,
    extraProperties?: EntityConfiguration
): EntityConfiguration => {
    if (!extraProperties) {
        extraProperties = {}
    }

    return createSensorConfiguration(configurationBase, readingName, entityName, {
        'device_class': 'humidity',
        'unit_of_measurement': '%',
        ...extraProperties,
    })
}

const createSensorConfiguration = (
    configurationBase: EntityConfiguration,
    readingName: string,
    entityName: string,
    extraProperties?: EntityConfiguration
): EntityConfiguration => {
    if (!extraProperties) {
        extraProperties = {}
    }

    return {
        ...configurationBase,
        'state_class': 'measurement',
        'name': entityName,
        'object_id': `eda_${readingName}`,
        'state_topic': `${TOPIC_PREFIX_READINGS}/${readingName}`,
        'unique_id': `eda-${readingName}`,
        ...extraProperties,
    }
}

const createNumberConfiguration = (
    configurationBase: EntityConfiguration,
    settingName: string,
    entityName: string,
    extraProperties?: EntityConfiguration
): EntityConfiguration => {
    if (!extraProperties) {
        extraProperties = {}
    }

    return {
        ...configurationBase,
        'command_topic': `${TOPIC_PREFIX_SETTINGS}/${settingName}/set`,
        'state_topic': `${TOPIC_PREFIX_SETTINGS}/${settingName}`,
        'unique_id': `eda-${settingName}`,
        'entity_category': 'config',
        'name': entityName,
        'object_id': `eda_${settingName}`,
        ...extraProperties,
    }
}

const createModeSwitchConfiguration = (
    configurationBase: EntityConfiguration,
    modeName: string,
    entityName: string,
    extraProperties?: EntityConfiguration
): EntityConfiguration => {
    if (!extraProperties) {
        extraProperties = {}
    }

    return {
        ...configurationBase,
        'unique_id': `eda-${modeName}`,
        'name': entityName,
        'object_id': `eda_${modeName}`,
        'icon': 'mdi:fan',
        'state_topic': `${TOPIC_PREFIX_MODE}/${modeName}`,
        'command_topic': `${TOPIC_PREFIX_MODE}/${modeName}/set`,
        ...extraProperties,
    }
}

const createSettingSwitchConfiguration = (
    configurationBase: EntityConfiguration,
    settingName: string,
    entityName: string,
    extraProperties?: EntityConfiguration
): EntityConfiguration => {
    if (!extraProperties) {
        extraProperties = {}
    }

    return {
        ...configurationBase,
        'unique_id': `eda-${settingName}`,
        'name': entityName,
        'object_id': `eda_${settingName}`,
        'state_topic': `${TOPIC_PREFIX_SETTINGS}/${settingName}`,
        'command_topic': `${TOPIC_PREFIX_SETTINGS}/${settingName}/set`,
        ...extraProperties,
    }
}

const createAlarmConfiguration = (
    configurationBase: EntityConfiguration,
    alarm: AlarmDescription
): EntityConfiguration => {
    return {
        ...configurationBase,
        'unique_id': `eda-${alarm.name}`,
        'name': alarm.description,
        'object_id': `eda_${alarm.name}`,
        'icon': 'mdi:alarm-bell',
        'state_topic': `${TOPIC_PREFIX_ALARM}/${alarm.name}`,
        'entity_category': 'diagnostic',
    }
}

const createDeviceStateConfiguration = (
    configurationBase: EntityConfiguration,
    stateName: string,
    entityName: string
): EntityConfiguration => {
    return {
        ...configurationBase,
        // Must not collide with switch names for the same thing, e.g. "away"
        'unique_id': `eda-state-${stateName}`,
        'name': entityName,
        'object_id': `eda_state_${stateName}`,
        'state_topic': `${TOPIC_PREFIX_DEVICE_STATE}/${stateName}`,
        'entity_category': 'diagnostic',
    }
}

const createButtonConfiguration = (
    configurationBase: EntityConfiguration,
    buttonName: string,
    entityName: string
): EntityConfiguration => {
    return {
        ...configurationBase,
        'unique_id': `eda-button-${buttonName}`,
        'name': entityName,
        'object_id': `eda_button_${buttonName}`,
        'command_topic': `${TOPIC_PREFIX_ALARM}/acknowledge`,
    }
}

const createSelectConfiguration = (
    configurationBase: EntityConfiguration,
    selectName: string,
    entityName: string,
    options: string[]
) => {
    return {
        ...configurationBase,
        'unique_id': `eda-select-${selectName}`,
        'name': entityName,
        'object_id': `eda_Select_${selectName}`,
        'options': options,
        'state_topic': `${TOPIC_PREFIX_SETTINGS}/${selectName}`,
        'command_topic': `${TOPIC_PREFIX_SETTINGS}/${selectName}/set`,
        'command_template': '{{ this.attributes.options.index(value) + 1 }}',
        'value_template': '{{ this.attributes.options[(value | int) - 1] }}',
    }
}
