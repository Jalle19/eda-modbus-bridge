import {
    getDeviceInformation,
    getFlag,
    getFlagSummary,
    getReadings,
    getSettings,
    setFlag,
    setSetting as modbusSetSetting,
    getAlarmStatuses
} from './modbus.mjs'

export const root = async (req, res) => {
    res.send('eda-modbus-bridge')
}

export const summary = async (modbusClient, req, res) => {
    const summary = {
        'flags': await getFlagSummary(modbusClient),
        'readings': await getReadings(modbusClient),
        'settings': await getSettings(modbusClient),
        'deviceInformation': await getDeviceInformation(modbusClient),
        'alarms': await getAlarmStatuses(modbusClient, true, false),
    }

    res.json(summary)
}

export const getFlagStatus = async (modbusClient, req, res) => {
    try {
        const flag = req.params['flag']
        const status = await getFlag(modbusClient, flag)

        res.json({
            'active': status,
        })
    } catch (e) {
        res.status(400)
        res.send(e.message)
    }
}

export const setFlagStatus = async (modbusClient, req, res) => {
    try {
        const flag = req.params['flag']
        const status = !!req.body['active']

        console.log(`Setting flag ${flag} to ${status}`)

        await setFlag(modbusClient, flag, status)

        res.json({
            'active': await getFlag(modbusClient, flag),
        })
    } catch (e) {
        res.status(400)
        res.send(e.message)
    }
}

export const setSetting = async (modbusClient, req, res) => {
    try {
        const setting = req.params['setting']
        const value = req.params['value']

        console.log(`Setting setting ${setting} to ${value}`)

        await modbusSetSetting(modbusClient, setting, value)

        res.json({
            'settings': await getSettings(modbusClient),
        })
    } catch (e) {
        res.status(400)
        res.send(e.message)
    }
}

export const getAlarms = async (modbusClient, req, res) => {
    try {
        const alarms = await getAlarmStatuses(modbusClient, true, false)

        res.json({
            'alarms': alarms,
        })
    } catch (e) {
        res.status(400)
        res.send(e.message)
    }
}