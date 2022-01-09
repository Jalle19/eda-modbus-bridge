import express from 'express'
import morgan from 'morgan'
import MQTT from 'async-mqtt'
import yargs from 'yargs'
import ModbusRTU from 'modbus-serial'
import { getFlagStatus, root, setFlagStatus, setSetting, summary } from './app/handlers.mjs'
import { publishValues, configureMqttDiscovery, subscribeToSettingChanges, handleMessage } from './app/mqtt.mjs'

const argv = yargs(process.argv.slice(2))
    .usage('node $0 [options]')
    .options({
        'device': {
            description: 'The serial device to use, e.g. /dev/ttyUSB0',
            demand: true,
            alias: 'd'
        },
        'modbusSlave': {
            description: 'The Modbus slave address',
            default: 1,
            alias: 's'
        },
        'httpListenAddress': {
            description: 'The address to listen (HTTP)',
            default: '0.0.0.0',
            alias: 'a',
        },
        'httpPort': {
            description: 'The port to listen on (HTTP)',
            default: 8080,
            alias: 'p'
        },
        'mqttBrokerUrl': {
            description: 'The URL to the MQTT broker, e.g. tcp://localhost:1883. Omit to disable MQTT support.',
            default: undefined,
            alias: 'm',
        },
        'mqttPublishInterval': {
            description: 'How often messages should be published over MQTT (in seconds)',
            default: 10,
            alias: 'i',
        }
    })
    .argv;

(async () => {
    // Create Modbus client
    console.log(`Opening serial connection to ${argv.device}, slave ID ${argv.modbusSlave}`)
    const modbusClient = new ModbusRTU()
    modbusClient.setID(argv.modbusSlave)
    modbusClient.setTimeout(5000) // 5 seconds
    await modbusClient.connectRTUBuffered(argv.device, {
        baudRate: 19200,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
    })

    // Create HTTP server
    const httpServer = express()
    httpServer.use(morgan('tiny'))
    httpServer.use(express.json())

    httpServer.get('/', root)
    httpServer.get('/summary', (req, res) => {
        return summary(modbusClient, req, res)
    })
    httpServer.get('/mode/:flag', (req, res) => {
        return getFlagStatus(modbusClient, req, res)
    })
    httpServer.post('/mode/:flag', (req, res) => {
        return setFlagStatus(modbusClient, req, res)
    })
    httpServer.post('/setting/:setting/:value', (req, res) => {
        return setSetting(modbusClient, req, res)
    })

    httpServer.listen(argv.httpPort, argv.httpListenAddress, () => {
        console.log(`Listening on http://${argv.httpListenAddress}:${argv.httpPort}`)
    })

    // Optionally create MQTT client
    if (argv.mqttBrokerUrl !== undefined) {
        console.log(`Connecting to MQTT broker at ${argv.mqttBrokerUrl}`)

        try {
            const mqttClient = await MQTT.connectAsync(argv.mqttBrokerUrl)

            // Publish readings/settings/modes regularly
            setInterval(async () => {
                await publishValues(modbusClient, mqttClient)
            }, argv.mqttPublishInterval * 1000)

            console.log(`MQTT scheduler started, will publish readings every ${argv.mqttPublishInterval} seconds`)

            // Subscribe to setting changes and register a handler
            await subscribeToSettingChanges(modbusClient, mqttClient)
            mqttClient.on('message', async (topicName, payload) => {
                await handleMessage(modbusClient, topicName, payload)
            })

            // Configure Home Assistant MQTT discovery
            await configureMqttDiscovery(modbusClient, mqttClient)
            console.log('Finished configuration Home Assistant MQTT discovery')
        } catch (e) {
            console.error(`Failed to connect to MQTT broker: ${e.message}`)
        }
    } else {
        console.log('No MQTT broker URL defined, not enabling MQTT support')
    }
})();
