import {
    getDeviceInformation,
    getFlag,
    getFlagSummary,
    getReadings,
    getSettings,
    setFlag,
    setSetting as modbusSetSetting,
    getAlarmHistory,
    getDeviceState,
} from './modbus.mjs'
import { createLogger } from './logger.mjs'

const logger = createLogger('http')

export const root = async (req, res) => {
    res.send('eda-modbus-bridge')
}

export const summary = async (modbusClient, req, res) => {
    try {
        const summary = {
            'flags': await getFlagSummary(modbusClient),
            'readings': await getReadings(modbusClient),
            'settings': await getSettings(modbusClient),
            'deviceInformation': await getDeviceInformation(modbusClient),
            'alarmHistory': await getAlarmHistory(modbusClient),
            'deviceState': await getDeviceState(modbusClient),
        }

        res.json(summary)
    } catch (e) {
        handleError(e, res)
    }
}

export const getFlagStatus = async (modbusClient, req, res) => {
    try {
        const flag = req.params['flag']
        const status = await getFlag(modbusClient, flag)

        res.json({
            'active': status,
        })
    } catch (e) {
        handleError(e, res)
    }
}

export const setFlagStatus = async (modbusClient, req, res) => {
    try {
        const flag = req.params['flag']
        const status = !!req.body['active']

        logger.info(`Setting flag ${flag} to ${status}`)

        await setFlag(modbusClient, flag, status)

        res.json({
            'active': await getFlag(modbusClient, flag),
        })
    } catch (e) {
        handleError(e, res)
    }
}

export const setSetting = async (modbusClient, req, res) => {
    try {
        const setting = req.params['setting']
        const value = req.params['value']

        logger.info(`Setting setting ${setting} to ${value}`)

        await modbusSetSetting(modbusClient, setting, value)

        res.json({
            'settings': await getSettings(modbusClient),
        })
    } catch (e) {
        handleError(e, res)
    }
}

const handleError = (e, res) => {
    logger.error(`An exception occurred: ${e.name}: ${e.message}`, e.stack)
    res.status(400)
    res.json(e)
}
