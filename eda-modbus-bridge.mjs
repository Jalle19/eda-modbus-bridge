import express from 'express'
import morgan from 'morgan'
import MQTT from 'async-mqtt'
import yargs from 'yargs'
import ModbusRTU from 'modbus-serial'
import {getFlagStatus, root, setFlagStatus, setSetting, summary} from './app/handlers.mjs'
import {getReadingsTopicValues} from './app/mqtt.mjs'

const argv = yargs(process.argv.slice(2))
    .usage('$0 [options]')
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
        'httpPort': {
            description: 'The HTTP port to listen on',
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

    httpServer.listen(argv.httpPort, '0.0.0.0', () => {
        console.log(`Listening on http://0.0.0.0:${argv.httpPort}`)
    })

    // Optionally create MQTT client
    if (argv.mqttBrokerUrl !== undefined) {
        console.log(`Connecting to MQTT broker at ${argv.mqttBrokerUrl}`)

        try {
            const mqttClient = await MQTT.connectAsync(argv.mqttBrokerUrl)

            setInterval(async () => {
                // Publish each reading to a separate topic
                const topicMap = await getReadingsTopicValues(modbusClient)
                const publishPromises = []

                for (const [topic, value] of Object.entries(topicMap)) {
                    publishPromises.push(mqttClient.publish(topic, JSON.stringify(value)))
                }

                await Promise.all(publishPromises)
            }, argv.mqttPublishInterval * 1000)
        } catch (e) {
            console.error(`Failed to connect to MQTT broker: ${e.message}`)
        }
    } else {
        console.log('No MQTT broker URL defined, not enabling MQTT support')
    }
})();