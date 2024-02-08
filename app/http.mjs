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

const root = async (req, res) => {
    res.send('eda-modbus-bridge')
}

const summary = async (modbusClient, req, res) => {
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

const getMode = async (modbusClient, req, res) => {
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

const setMode = async (modbusClient, req, res) => {
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

const setSetting = async (modbusClient, req, res) => {
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

export const configureRoutes = (httpServer, modbusClient) => {
    httpServer.get('/', root)
    httpServer.get('/summary', (req, res) => {
        return summary(modbusClient, req, res)
    })
    httpServer.get('/mode/:mode', (req, res) => {
        return getMode(modbusClient, req, res)
    })
    httpServer.post('/mode/:mode', (req, res) => {
        return setMode(modbusClient, req, res)
    })
    httpServer.post('/setting/:setting/:value', (req, res) => {
        return setSetting(modbusClient, req, res)
    })
}

const handleError = (e, res) => {
    logger.error(`An exception occurred: ${e.name}: ${e.message}`, e.stack)
    res.status(400)
    res.json(e)
}
