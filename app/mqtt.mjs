import { getReadings, getDeviceInformation, getSettings } from './modbus.mjs'

const TOPIC_PREFIX = 'eda'

export const publishReadings = async (modbusClient, mqttClient) => {
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

    // Configuration for each entity
    const entityConfigurationMap = {
        ...temperatureSensorConfigurationMap,
        ...humiditySensorConfigurationMap,
        ...genericSensorConfigurationMap,
    }

    // Publish configurations
    for (const [entityName, configuration] of Object.entries(entityConfigurationMap)) {
        const configurationTopicName = `homeassistant/sensor/${deviceIdentifier}/${entityName}/config`

        console.log(`Publishing Home Assistant auto-discovery configuration for "${entityName}"...`)
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
