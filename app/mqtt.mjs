import {getReadings} from './modbus.mjs'

const TOPIC_PREFIX = 'eda'

export const publishReadings = async (modbusClient, mqttClient) => {
    // Create a map from topic name to value that should be published
    let topicMap = {
        [`${TOPIC_PREFIX}/status`]: 'online',
    }

    // Publish each reading to a separate topic
    const readings = await getReadings(modbusClient)

    for (const [reading, value] of Object.entries(readings)) {
        const topicName = `${TOPIC_PREFIX}/readings/${reading}`
        topicMap[topicName] = JSON.stringify(value)
    }

    const publishPromises = []

    for (const [topic, value] of Object.entries(topicMap)) {
        publishPromises.push(mqttClient.publish(topic, value))
    }

    await Promise.all(publishPromises)
}
