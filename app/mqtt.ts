import {
    getReadings,
    getDeviceInformation,
    getSettings,
    setSetting,
    getModeSummary,
    setMode,
    getAlarmSummary,
    getDeviceState,
    acknowledgeAlarm,
} from './modbus'
import { createLogger } from './logger'
import ModbusRTU from 'modbus-serial'
import { MqttClient } from 'mqtt'

export const TOPIC_PREFIX = 'eda'
export const TOPIC_PREFIX_MODE = `${TOPIC_PREFIX}/mode`
export const TOPIC_PREFIX_READINGS = `${TOPIC_PREFIX}/readings`
export const TOPIC_PREFIX_SETTINGS = `${TOPIC_PREFIX}/settings`
export const TOPIC_PREFIX_ALARM = `${TOPIC_PREFIX}/alarm`
export const TOPIC_PREFIX_DEVICE_INFORMATION = `${TOPIC_PREFIX}/deviceInformation`
export const TOPIC_PREFIX_DEVICE_STATE = `${TOPIC_PREFIX}/deviceState`
export const TOPIC_NAME_STATUS = `${TOPIC_PREFIX}/status`

type TopicMap = Record<string, string>

const logger = createLogger('mqtt')

export const publishValues = async (modbusClient: ModbusRTU, mqttClient: MqttClient) => {
    // Create a map from topic name to value that should be published
    const topicMap: TopicMap = {
        [TOPIC_NAME_STATUS]: 'online',
    }

    // Publish mode summary
    await publishModeSummary(modbusClient, mqttClient)

    // Publish each reading
    const readings = await getReadings(modbusClient)

    for (const [reading, value] of Object.entries(readings)) {
        const topicName = `${TOPIC_PREFIX_READINGS}/${reading}`
        topicMap[topicName] = JSON.stringify(value)
    }

    // Publish each setting
    await publishSettings(modbusClient, mqttClient)

    // Publish alarm summary
    const alarmSummary = await getAlarmSummary(modbusClient)

    for (const [, alarm] of Object.entries(alarmSummary)) {
        const topicName = `${TOPIC_PREFIX_ALARM}/${alarm.name}`

        topicMap[topicName] = createBinaryValue(alarm.state === 2)
    }

    // Publish device state
    const deviceState = await getDeviceState(modbusClient)

    for (const [name, value] of Object.entries(deviceState)) {
        const topicName = `${TOPIC_PREFIX_DEVICE_STATE}/${name}`

        topicMap[topicName] = createBinaryValue(value)
    }

    await publishTopics(mqttClient, topicMap)
}

export const publishDeviceInformation = async (modbusClient: ModbusRTU, mqttClient: MqttClient) => {
    const topicMap: TopicMap = {}

    const deviceInformation = await getDeviceInformation(modbusClient)

    for (const [item, value] of Object.entries(deviceInformation)) {
        const topicName = `${TOPIC_PREFIX_DEVICE_INFORMATION}/${item}`
        topicMap[topicName] = JSON.stringify(value)
    }

    logger.debug('Publising device information...')

    // Retain the values, they never change
    await publishTopics(mqttClient, topicMap, {
        retain: true,
    })
}

const publishModeSummary = async (modbusClient: ModbusRTU, mqttClient: MqttClient) => {
    // Create a map from topic name to value that should be published
    const topicMap: TopicMap = {}

    // Publish state for each mode.
    const modeSummary = await getModeSummary(modbusClient)

    for (const [mode, state] of Object.entries(modeSummary)) {
        const topicName = `${TOPIC_PREFIX_MODE}/${mode}`

        topicMap[topicName] = createBinaryValue(state)
    }

    await publishTopics(mqttClient, topicMap)
}

const publishSettings = async (modbusClient: ModbusRTU, mqttClient: MqttClient) => {
    // Create a map from topic name to value that should be published
    const topicMap: TopicMap = {}
    const settings = await getSettings(modbusClient)

    for (const [setting, value] of Object.entries(settings)) {
        const topicName = `${TOPIC_PREFIX_SETTINGS}/${setting}`

        topicMap[topicName] = typeof value === 'boolean' ? createBinaryValue(value) : JSON.stringify(value)
    }

    await publishTopics(mqttClient, topicMap)
}

const publishTopics = async (mqttClient: MqttClient, topicMap: TopicMap, publishOptions = {}) => {
    const publishPromises = []

    for (const [topic, value] of Object.entries(topicMap)) {
        publishPromises.push(mqttClient.publishAsync(topic, value, publishOptions))
    }

    await Promise.all(publishPromises)
}

export const subscribeToChanges = async (mqttClient: MqttClient) => {
    // Subscribe to writable topics
    const topicNames = [
        `${TOPIC_PREFIX_MODE}/+/set`,
        `${TOPIC_PREFIX_SETTINGS}/+/set`,
        `${TOPIC_PREFIX_ALARM}/acknowledge`,
    ]

    for (const topicName of topicNames) {
        logger.info(`Subscribing to topic(s) ${topicName}`)

        await mqttClient.subscribeAsync(topicName)
    }
}

export const handleMessage = async (
    modbusClient: ModbusRTU,
    mqttClient: MqttClient,
    topicName: string,
    rawPayload: Buffer
) => {
    logger.info(`Received ${rawPayload} on topic ${topicName}`)

    const payload = parsePayload(rawPayload)

    if (topicName.startsWith(TOPIC_PREFIX_SETTINGS) && topicName.endsWith('/set')) {
        // Handle settings updates
        const settingName = topicName.substring(TOPIC_PREFIX_SETTINGS.length + 1, topicName.lastIndexOf('/'))

        logger.info(`Updating setting ${settingName} to ${payload}`)

        await setSetting(modbusClient, settingName, payload)
        await publishSettings(modbusClient, mqttClient)
    } else if (topicName.startsWith(TOPIC_PREFIX_MODE) && topicName.endsWith('/set')) {
        // Handle mode changes
        const mode = topicName.substring(TOPIC_PREFIX_MODE.length + 1, topicName.lastIndexOf('/'))

        logger.info(`Updating mode ${mode} to ${payload}`)

        await setMode(modbusClient, mode, Boolean(payload))
        await publishModeSummary(modbusClient, mqttClient)
    } else if (topicName.startsWith(TOPIC_PREFIX_ALARM) && topicName.endsWith('/acknowledge')) {
        // Acknowledge alarm
        logger.info('Acknowledging currently active alarm (if any)')

        await acknowledgeAlarm(modbusClient)
    }
}

export const validateBrokerUrl = (brokerUrl: string) => {
    return brokerUrl.startsWith('mqtt://') || brokerUrl.startsWith('mqtts://')
}

const createBinaryValue = (value: boolean) => {
    // Boolean values are exposed as "ON" and "OFF" respectively since those are the
    // defaults for MQTT binary sensors in Home Assistant
    return value ? 'ON' : 'OFF'
}

const parsePayload = (rawPayload: Buffer) => {
    // Payload looks like a string when logged, but any comparison with === will equal false unless we convert the
    // Buffer to a string
    let payload: string | boolean = rawPayload.toString()

    // Convert "ON"/"OFF" booleans to real booleans
    if (payload === 'ON') {
        payload = true
    }
    if (payload === 'OFF') {
        payload = false
    }

    return payload
}
