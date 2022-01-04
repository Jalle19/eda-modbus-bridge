import {getReadings} from './modbus.mjs'

const TOPIC_PREFIX = 'eda'

export const getReadingsTopicValues = async (modbusClient) => {
    const readings = await getReadings(modbusClient)
    let topicMap = {}

    for (const [reading, value] of Object.entries(readings)) {
        const topicName = `${TOPIC_PREFIX}/readings/${reading}`
        topicMap[topicName] = value
    }

    return topicMap
}