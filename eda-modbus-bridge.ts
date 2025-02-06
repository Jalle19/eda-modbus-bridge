import express from 'express'
import expressWinston from 'express-winston'
import mqtt, { MqttClient } from 'mqtt'
import yargs from 'yargs'
import ModbusRTU from 'modbus-serial'
import { configureRoutes } from './app/http'
import {
    handleMessage,
    publishDeviceInformation,
    publishValues,
    subscribeToChanges,
    validateBrokerUrl,
} from './app/mqtt.js'
import { configureMqttDiscovery } from './app/homeassistant'
import { createLogger, setLogLevel } from './app/logger'
import { ModbusDeviceType, ModbusRtuDevice, ModbusTcpDevice, parseDevice, validateDevice } from './app/modbus'
import { setIntervalAsync } from 'set-interval-async'

const MQTT_INITIAL_RECONNECT_RETRY_INTERVAL_SECONDS = 5

const argv = yargs(process.argv.slice(2))
    .usage('node $0 [options]')
    .options({
        'device': {
            description:
                'The Modbus device to use, e.g. /dev/ttyUSB0 for Modbus RTU or tcp://192.168.1.40:502 for Modbus TCP',
            type: 'string',
            demandOption: true,
            alias: 'd',
        },
        'modbusSlave': {
            description: 'The Modbus slave address',
            type: 'number',
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
            type: 'string',
            default: '0.0.0.0',
            alias: 'a',
        },
        'httpPort': {
            description: 'The port to listen on (HTTP)',
            type: 'number',
            default: 8080,
            alias: 'p',
        },
        'mqttBrokerUrl': {
            description: 'The URL to the MQTT broker, e.g. mqtt://localhost:1883. Omit to disable MQTT support.',
            type: 'string',
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
    })
    .parseSync()

void (async () => {
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
    if (modbusDevice.type === ModbusDeviceType.RTU) {
        const rtuDevice = modbusDevice as ModbusRtuDevice
        await modbusClient.connectRTUBuffered(rtuDevice.path, {
            baudRate: 19200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
        })
    } else if (modbusDevice.type === ModbusDeviceType.TCP) {
        const tcpDevice = modbusDevice as ModbusTcpDevice
        await modbusClient.connectTCP(tcpDevice.hostname, {
            port: tcpDevice.port,
        })
    }

    // Optionally create HTTP server
    if (argv.http) {
        // Define middleware
        const httpServer = express()
        httpServer.use(expressWinston.logger({ winstonInstance: httpLogger }))
        httpServer.use(express.json())

        // Define routes
        configureRoutes(httpServer, modbusClient)

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
                let mqttClient: MqttClient
                let connectedOnce = false
                const retryIntervalMs = MQTT_INITIAL_RECONNECT_RETRY_INTERVAL_SECONDS * 1000

                do {
                    try {
                        mqttClient = await mqtt.connectAsync(argv.mqttBrokerUrl, clientOptions)
                        connectedOnce = true
                        logger.info(`Successfully connected to MQTT broker at ${argv.mqttBrokerUrl}`)
                    } catch (e) {
                        const err = e as Error
                        logger.error(
                            `Failed to connect to MQTT broker: ${err.message}. Retrying in ${retryIntervalMs} milliseconds`
                        )

                        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs))
                    }
                } while (!connectedOnce)

                mqttClient = mqttClient!

                // Publish device information once only (since it doesn't change)
                await publishDeviceInformation(modbusClient, mqttClient)

                // Publish readings/settings/modes/alarms once immediately, then regularly according to the configured
                // interval.
                await publishValues(modbusClient, mqttClient)
                setIntervalAsync(async () => {
                    await publishValues(modbusClient, mqttClient)
                }, argv.mqttPublishInterval * 1000)

                logger.info(`MQTT scheduler started, will publish readings every ${argv.mqttPublishInterval} seconds`)

                // Subscribe to changes and register a handler
                await subscribeToChanges(mqttClient)
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
                const err = e as Error
                logger.error(`An exception occurred: ${err.name}: ${err.message}`, err.stack)
            }
        }
    }
})()
