import { getReadings, getDeviceInformation, getSettings, setSetting } from './modbus.mjs'

const TOPIC_PREFIX = 'eda'

export const publishValues = async (modbusClient, mqttClient) => {
    // Create a map from topic name to value that should be published
    let topicMap = {
        [`${TOPIC_PREFIX}/status`]: 'online',
    }

    // Publish each reading
    const readings = await getReadings(modbusClient)

    for (const [reading, value] of Object.entries(readings)) {
        const topicName = `${TOPIC_PREFIX}/readings/${reading}`
        topicMap[topicName] = JSON.stringify(value)
    }

    // Publish each setting
    const settings = await getSettings(modbusClient)

    for (const [setting, value] of Object.entries(settings)) {
        const topicName = `${TOPIC_PREFIX}/settings/${setting}`
        topicMap[topicName] = JSON.stringify(value)
    }

    const publishPromises = []

    for (const [topic, value] of Object.entries(topicMap)) {
        publishPromises.push(mqttClient.publish(topic, value))
    }

    await Promise.all(publishPromises)
}

export const subscribeToSettingChanges = async (modbusClient, mqttClient) => {
    const topicName = `${TOPIC_PREFIX}/settings/+/set`

    console.log(`Subscribing to topic(s) ${topicName}`)

    await mqttClient.subscribe(topicName)
}

export const handleMessage = async (modbusClient, topicName, payload) => {
    console.log(`Received ${payload} on topic ${topicName}`)

    // Handle settings updates
    if (topicName.startsWith('eda/settings/') && topicName.endsWith('/set')) {
        const settingName = topicName.substring('eda/settings/'.length, topicName.lastIndexOf('/'))

        console.log(`Updating setting ${settingName} to ${payload}`)

        await setSetting(modbusClient, settingName, payload)
    }
}

export const configureMqttDiscovery = async (modbusClient, mqttClient) => {
    const modbusDeviceInformation = await getDeviceInformation(modbusClient)
    const familyType = modbusDeviceInformation.familyType
    const serialNumber = modbusDeviceInformation.serialNumber
    const softwareVersion = modbusDeviceInformation.softwareVersion
    const deviceIdentifier = `Enervent-${familyType}-${serialNumber}-${softwareVersion}`;

    // The "device" object that is part of each sensor's configuration payload
    const mqttDeviceInformation = {
        'identifiers': deviceIdentifier,
        'name': `Enervent ${familyType}`,
        'sw_version': softwareVersion,
        'model': familyType,
        'manufacturer': 'Enervent',
    }

    const configurationBase = {
        'platform': 'mqtt',
        'availability_topic': `${TOPIC_PREFIX}/status`,
        'device': mqttDeviceInformation,
    }

    // Temperature sensors
    const temperatureSensorConfigurationMap = {
        'freshAirTemperature': createTemperatureSensorConfiguration(configurationBase, 'freshAirTemperature', 'Outside temperature',),
        'supplyAirTemperature': createTemperatureSensorConfiguration(configurationBase, 'supplyAirTemperature', 'Supply air temperature'),
        'supplyAirTemperatureAfterHeatRecovery': createTemperatureSensorConfiguration(configurationBase, 'supplyAirTemperatureAfterHeatRecovery', 'Supply air temperature (after heat recovery)'),
        'exhaustAirTemperature': createTemperatureSensorConfiguration(configurationBase, 'exhaustAirTemperature', 'Exhaust air temperature'),
        'wasteAirTemperature': createTemperatureSensorConfiguration(configurationBase, 'wasteAirTemperature', 'Waste air temperature'),
    }

    // Humidity sensors
    const humiditySensorConfigurationMap = {
        'exhaustAirHumidity': createHumiditySensorConfiguration(configurationBase, 'exhaustAirHumidity', 'Exhaust air humidity'),
        'mean48HourExhaustHumidity': createHumiditySensorConfiguration(configurationBase, 'mean48HourExhaustHumidity', 'Exhaust air humidity (48h mean)'),
    }

    // Generic sensors (percentages, minutes left, cascade values)
    const genericSensorConfigurationMap = {
        'heatRecoverySupplySide': createGenericSensorConfiguration(configurationBase, 'heatRecoverySupplySide', 'Heat recovery (supply)', '%'),
        'heatRecoveryExhaustSide': createGenericSensorConfiguration(configurationBase, 'heatRecoveryExhaustSide', 'Heat recovery (exhaust)', '%'),
        'cascadeSp': createGenericSensorConfiguration(configurationBase, 'cascadeSp', 'Cascade setpoint'),
        'cascadeP': createGenericSensorConfiguration(configurationBase, 'cascadeP', 'Cascade P-value'),
        'cascadeI': createGenericSensorConfiguration(configurationBase, 'cascadeI', 'Cascade I-value'),
        'overPressureTimeLeft': createGenericSensorConfiguration(configurationBase, 'overPressureTimeLeft', 'Overpressure time left', 'minutes'),
        'ventilationLevelTarget': createGenericSensorConfiguration(configurationBase, 'ventilationLevelTarget', 'Ventilation level (target)', '%'),
        'ventilationLevelActual': createGenericSensorConfiguration(configurationBase, 'ventilationLevelActual', 'Ventilation level (actual)', '%'),
    }

    // Configurable numbers
    const numberConfigurationMap = {
        'overPressureDelay': createNumberConfiguration(configurationBase, 'overPressureDelay', 'Overpressure delay', {
            'min': 1,
            'max': 60,
            'unit_of_measurement': 'minutes',
        }),
        'awayVentilationLevel': createNumberConfiguration(configurationBase, 'awayVentilationLevel', 'Away ventilation level', {
            'min': 1,
            'max': 100,
            'unit_of_measurement': '%',
        }),
        'awayTemperatureReduction': createNumberConfiguration(configurationBase, 'awayTemperatureReduction', 'Away temperature reduction', {
            'min': 0,
            'max': 20,
            'unit_of_measurement': '°C',
        }),
        'longAwayVentilationLevel': createNumberConfiguration(configurationBase, 'longAwayVentilationLevel', 'Long away ventilation level', {
            'min': 1,
            'max': 100,
            'unit_of_measurement': '%',
        }),
        'longAwayTemperatureReduction': createNumberConfiguration(configurationBase, 'longAwayTemperatureReduction', 'Long away temperature reduction', {
            'min': 0,
            'max': 20,
            'unit_of_measurement': '°C',
        }),
        'temperatureTarget': createNumberConfiguration(configurationBase, 'temperatureTarget', 'Temperature target', {
            'min': 0,
            'max': 30,
            'unit_of_measurement': '°C',
        })
    }

    // Configuration for each sensor
    const sensorConfigurationMap = {
        ...temperatureSensorConfigurationMap,
        ...humiditySensorConfigurationMap,
        ...genericSensorConfigurationMap,
    }

    // Publish configurations
    for (const [entityName, configuration] of Object.entries(sensorConfigurationMap)) {
        const configurationTopicName = `homeassistant/sensor/${deviceIdentifier}/${entityName}/config`

        console.log(`Publishing Home Assistant auto-discovery configuration for sensor "${entityName}"...`)
        await mqttClient.publish(configurationTopicName, JSON.stringify(configuration))
    }

    for (const [entityName, configuration] of Object.entries(numberConfigurationMap)) {
        const configurationTopicName = `homeassistant/number/${deviceIdentifier}/${entityName}/config`

        console.log(`Publishing Home Assistant auto-discovery configuration for number "${entityName}"...`)
        await mqttClient.publish(configurationTopicName, JSON.stringify(configuration))
    }
}

const createTemperatureSensorConfiguration = (configurationBase, readingName, entityName) => {
    return {
        ...configurationBase,
        'device_class': 'temperature',
        'unit_of_measurement': '°C',
        'state_class': 'measurement',
        'name': entityName,
        'state_topic': `${TOPIC_PREFIX}/readings/${readingName}`,
        'unique_id': `eda-${readingName}`
    }
}

const createHumiditySensorConfiguration = (configurationBase, readingName, entityName) => {
    return {
        ...configurationBase,
        'device_class': 'humidity',
        'unit_of_measurement': '%H',
        'state_class': 'measurement',
        'name': entityName,
        'state_topic': `${TOPIC_PREFIX}/readings/${readingName}`,
        'unique_id': `eda-${readingName}`
    }
}

const createGenericSensorConfiguration = (configurationBase, readingName, entityName, unit) => {
    const configuration = {
        ...configurationBase,
        'state_class': 'measurement',
        'name': entityName,
        'state_topic': `${TOPIC_PREFIX}/readings/${readingName}`,
        'unique_id': `eda-${readingName}`
    }

    if (unit) {
        configuration['unit_of_measurement'] = unit
    }

    return configuration;
}

const createNumberConfiguration = (configurationBase, settingName, entityName, extraProperties) => {
    if (!extraProperties) {
        extraProperties = {}
    }

    return {
        ...configurationBase,
        'command_topic': `${TOPIC_PREFIX}/settings/${settingName}/set`,
        'state_topic': `${TOPIC_PREFIX}/settings/${settingName}`,
        'unique_id': `eda-${settingName}`,
        'entity_category': 'config',
        'name': entityName,
        ...extraProperties,
    }
}
