import express from 'express'
import expressWinston from 'express-winston'
import mqtt from 'mqtt'
import yargs from 'yargs'
import ModbusRTU from 'modbus-serial'
import { getMode, root, setMode, setSetting, summary } from './app/http.mjs'
import {
    publishValues,
    subscribeToChanges,
    handleMessage,
    publishDeviceInformation,
    validateBrokerUrl,
} from './app/mqtt.mjs'
import { configureMqttDiscovery } from './app/homeassistant.mjs'
import { createLogger, setLogLevel } from './app/logger.mjs'
import { MODBUS_DEVICE_TYPE, parseDevice, validateDevice } from './app/modbus.mjs'

const MQTT_INITIAL_RECONNECT_RETRY_INTERVAL_SECONDS = 5

const argv = yargs(process.argv.slice(2))
    .usage('node $0 [options]')
    .options({
        'device': {
            description:
                'The Modbus device to use, e.g. /dev/ttyUSB0 for Modbus RTU or tcp://192.168.1.40:502 for Modbus TCP',
            demand: true,
            alias: 'd',
        },
        'modbusSlave': {
            description: 'The Modbus slave address',
            default: 1,
            alias: 's',
        },
        'http': {
            description: 'Whether to enable the HTTP server or not',
            type: 'boolean',
            default: true,
        },
        'httpListenAddress': {
            description: 'The address to listen (HTTP)',
            default: '0.0.0.0',
            alias: 'a',
        },
        'httpPort': {
            description: 'The port to listen on (HTTP)',
            default: 8080,
            alias: 'p',
        },
        'mqttBrokerUrl': {
            description: 'The URL to the MQTT broker, e.g. mqtt://localhost:1883. Omit to disable MQTT support.',
            default: undefined,
            alias: 'm',
        },
        'mqttUsername': {
            description: 'The username to use when connecting to the MQTT broker. Omit to disable authentication.',
            default: undefined,
        },
        'mqttPassword': {
            description:
                'The password to use when connecting to the MQTT broker. Required when mqttUsername is defined. Omit to disable authentication.',
            default: undefined,
        },
        'mqttPublishInterval': {
            description: 'How often messages should be published over MQTT (in seconds)',
            default: 10,
            alias: 'i',
        },
        'mqttDiscovery': {
            description:
                'Whether to enable Home Assistant MQTT discovery support. Only effective when mqttBrokerUrl is defined.',
            type: 'boolean',
            default: true,
        },
        'debug': {
            description: 'Enable debug logging',
            type: 'boolean',
            default: false,
            alias: 'v',
        },
    }).argv

;(async () => {
    // Create logger(s)
    const logger = createLogger('main')
    if (argv.debug) {
        setLogLevel(logger, 'debug')
    }

    const httpLogger = createLogger('http')

    // Create Modbus client. Abort if a malformed device is specified.
    if (!validateDevice(argv.device)) {
        logger.error(`Malformed Modbus device ${argv.device} specified, exiting`)
        process.exit(1)
    }
    logger.info(`Opening Modbus connection to ${argv.device}, slave ID ${argv.modbusSlave}`)
    const modbusDevice = parseDevice(argv.device)
    const modbusClient = new ModbusRTU()
    modbusClient.setID(argv.modbusSlave)
    modbusClient.setTimeout(5000) // 5 seconds

    // Use buffered RTU or TCP depending on device type
    if (modbusDevice.type === MODBUS_DEVICE_TYPE.RTU) {
        await modbusClient.connectRTUBuffered(modbusDevice.path, {
            baudRate: 19200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
        })
    } else if (modbusDevice.type === MODBUS_DEVICE_TYPE.TCP) {
        await modbusClient.connectTCP(modbusDevice.hostname, {
            port: modbusDevice.port,
        })
    }

    // Optionally create HTTP server
    if (argv.http) {
        // Define middleware
        const httpServer = express()
        httpServer.use(expressWinston.logger({ winstonInstance: httpLogger }))
        httpServer.use(express.json())

        // Define routes
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

        httpServer.listen(argv.httpPort, argv.httpListenAddress, () => {
            httpLogger.info(`Listening on http://${argv.httpListenAddress}:${argv.httpPort}`)
        })
    }

    // Optionally create MQTT client
    if (argv.mqttBrokerUrl !== undefined) {
        if (!validateBrokerUrl(argv.mqttBrokerUrl)) {
            logger.error(`Malformed MQTT broker URL: ${argv.mqttBrokerUrl}. Should be e.g. mqtt://localhost:1883.`)
        } else {
            logger.info(`Connecting to MQTT broker at ${argv.mqttBrokerUrl}`)

            try {
                // Handle authentication
                let clientOptions = {}

                if (argv.mqttUsername && argv.mqttPassword) {
                    logger.info('Using MQTT broker authentication')

                    clientOptions = {
                        'username': argv.mqttUsername,
                        'password': argv.mqttPassword,
                    }
                }

                // The MQTT client handles reconnections automatically, but only after it has connected successfully once.
                // Retry manually until we get an initial connection.
                let mqttClient
                let connectedOnce = false
                const retryIntervalMs = MQTT_INITIAL_RECONNECT_RETRY_INTERVAL_SECONDS * 1000

                do {
                    try {
                        mqttClient = await mqtt.connectAsync(argv.mqttBrokerUrl, clientOptions)
                        connectedOnce = true
                        logger.info(`Successfully connected to MQTT broker at ${argv.mqttBrokerUrl}`)
                    } catch (e) {
                        logger.error(
                            `Failed to connect to MQTT broker: ${e.message}. Retrying in ${retryIntervalMs} milliseconds`
                        )

                        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs))
                    }
                } while (!connectedOnce)

                // Publish device information once only (since it doesn't change)
                await publishDeviceInformation(modbusClient, mqttClient)

                // Publish readings/settings/modes/alarms once immediately, then regularly according to the configured
                // interval.
                await publishValues(modbusClient, mqttClient)
                setInterval(async () => {
                    await publishValues(modbusClient, mqttClient)
                }, argv.mqttPublishInterval * 1000)

                logger.info(`MQTT scheduler started, will publish readings every ${argv.mqttPublishInterval} seconds`)

                // Subscribe to changes and register a handler
                await subscribeToChanges(modbusClient, mqttClient)
                mqttClient.on('message', async (topicName, payload) => {
                    await handleMessage(modbusClient, mqttClient, topicName, payload)
                })

                // Optionally configure Home Assistant MQTT discovery
                if (argv.mqttDiscovery) {
                    await configureMqttDiscovery(modbusClient, mqttClient)
                    logger.info('Finished configuration Home Assistant MQTT discovery')
                }

                // Log reconnection attempts
                mqttClient.on('reconnect', () => {
                    logger.info(`Attempting to reconnect to ${argv.mqttBrokerUrl}`)
                })
            } catch (e) {
                logger.error(`An exception occurred: ${e.name}: ${e.message}`, e.stack)
            }
        }
    }
})()
