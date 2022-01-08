import {getReadings} from './modbus.mjs'

const TOPIC_PREFIX = 'eda'

export const getReadingsTopicValues = async (modbusClient) => {
    // Always publish "online" to our status topic
    let topicMap = {
        [`${TOPIC_PREFIX}/status`]: 'online'
    }

    const readings = await getReadings(modbusClient)

    for (const [reading, value] of Object.entries(readings)) {
        const topicName = `${TOPIC_PREFIX}/readings/${reading}`
        topicMap[topicName] = JSON.stringify(value)
    }

    return topicMap
}