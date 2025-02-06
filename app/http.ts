import {
    getDeviceInformation,
    getMode as modbusGetMode,
    getModeSummary,
    getReadings,
    getSettings,
    setMode as modbusSetMode,
    setSetting as modbusSetSetting,
    acknowledgeAlarm as modbusAcknowledgeAlarm,
    getDeviceState,
    getNewestAlarm,
    getAlarmSummary,
} from './modbus'
import { createLogger } from './logger'
import { Express, Request, Response } from 'express'
import ModbusRTU from 'modbus-serial'

const logger = createLogger('http')

const root = async (req: Request, res: Response) => {
    res.send('eda-modbus-bridge')
}

const summary = async (modbusClient: ModbusRTU, req: Request, res: Response) => {
    try {
        const modeSummary = await getModeSummary(modbusClient)
        const newestAlarm = await getNewestAlarm(modbusClient)

        const summary = {
            // TODO: Remove in next major version
            'flags': modeSummary,
            'modes': modeSummary,
            'readings': await getReadings(modbusClient),
            'settings': await getSettings(modbusClient),
            'deviceInformation': await getDeviceInformation(modbusClient),
            'deviceState': await getDeviceState(modbusClient),
            'alarmSummary': await getAlarmSummary(modbusClient),
            'activeAlarm': newestAlarm?.state === 2 ? newestAlarm : null,
        }

        res.json(summary)
    } catch (e) {
        handleError(e as Error, res)
    }
}

const getMode = async (modbusClient: ModbusRTU, req: Request, res: Response) => {
    try {
        const mode = req.params['mode']
        const status = await modbusGetMode(modbusClient, mode)

        res.json({
            'active': status,
        })
    } catch (e) {
        handleError(e as Error, res)
    }
}

const setMode = async (modbusClient: ModbusRTU, req: Request, res: Response) => {
    try {
        const mode = req.params['mode']
        const status = !!req.body['active']

        logger.info(`Setting mode ${mode} to ${status}`)

        await modbusSetMode(modbusClient, mode, status)

        res.json({
            'active': await modbusGetMode(modbusClient, mode),
        })
    } catch (e) {
        handleError(e as Error, res)
    }
}

const setSetting = async (modbusClient: ModbusRTU, req: Request, res: Response) => {
    try {
        const setting = req.params['setting']
        const value = req.params['value']

        logger.info(`Setting setting ${setting} to ${value}`)

        await modbusSetSetting(modbusClient, setting, value)

        res.json({
            'settings': await getSettings(modbusClient),
        })
    } catch (e) {
        if (e instanceof RangeError) {
            handleError(e as Error, res, 400)
        } else {
            handleError(e as Error, res)
        }
    }
}

const acknowledgeAlarm = async (modbusClient: ModbusRTU, req: Request, res: Response) => {
    try {
        logger.info('Acknowledging currently active alarm (if any)')

        await modbusAcknowledgeAlarm(modbusClient)
    } catch (e) {
        handleError(e as Error, res)
    }
}

export const configureRoutes = (httpServer: Express, modbusClient: ModbusRTU) => {
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
    httpServer.post('/alarm/acknowledge', (req, res) => {
        return acknowledgeAlarm(modbusClient, req, res)
    })
}

const handleError = (e: Error, res: Response, statusCode?: number) => {
    logger.error(`An exception occurred: ${e.name}: ${e.message}`, e.stack)
    // Use HTTP 500 if no status code has been set
    res.status(statusCode ?? 500)
    res.json({
        error: e.name,
        message: e.message,
    })
}
