import {
    getDeviceInformation,
    getMode as modbusGetMode,
    getModeSummary,
    getReadings,
    getSettings,
    setMode as modbusSetMode,
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
        let modeSummary = await getModeSummary(modbusClient)
        const summary = {
            // TODO: Remove in next major version
            'flags': modeSummary,
            'modes': modeSummary,
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

export const getMode = async (modbusClient, req, res) => {
    try {
        const mode = req.params['mode']
        const status = await modbusGetMode(modbusClient, mode)

        res.json({
            'active': status,
        })
    } catch (e) {
        handleError(e, res)
    }
}

export const setMode = async (modbusClient, req, res) => {
    try {
        const mode = req.params['mode']
        const status = !!req.body['active']

        logger.info(`Setting mode ${mode} to ${status}`)

        await modbusSetMode(modbusClient, mode, status)

        res.json({
            'active': await modbusGetMode(modbusClient, mode),
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
