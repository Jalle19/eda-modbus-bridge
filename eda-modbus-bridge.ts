import express from 'express'
import expressWinston from 'express-winston'
import mqtt, { MqttClient } from 'mqtt'
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
import { ErrorHandler } from './app/error'
import { argv } from './app/args'

const MQTT_INITIAL_RECONNECT_RETRY_INTERVAL_SECONDS = 5
const MAX_SUBSEQUENT_ERRORS = 10

const logger = createLogger('main')

void (async () => {
    // Adjust log level
    if (argv.debug) {
        setLogLevel(logger, 'debug')
    }

    // Create Modbus client. Abort if a malformed device is specified.
    if (!validateDevice(argv.device)) {
        logger.error(`Malformed Modbus device ${argv.device} specified, exiting`)
        process.exit(1)
    }
    logger.info(
        `Opening Modbus connection to ${argv.device}, slave ID ${argv.modbusSlave}, ${argv.modbusTimeout} second timeout`
    )
    const modbusDevice = parseDevice(argv.device)
    const modbusClient = new ModbusRTU()
    modbusClient.setID(argv.modbusSlave)
    modbusClient.setTimeout(argv.modbusTimeout * 1000)

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
        // Create component-specific logger
        const httpLogger = createLogger('http')

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

            const errorHandler = new ErrorHandler(MAX_SUBSEQUENT_ERRORS)

            // Publish device information once only (since it doesn't change)
            await publishDeviceInformation(modbusClient, mqttClient)

            // Publish readings/settings/modes/alarms once immediately, then regularly according to the configured
            // interval.
            await publishValues(modbusClient, mqttClient)
            setIntervalAsync(async () => {
                try {
                    await publishValues(modbusClient, mqttClient)
                    errorHandler.resetCounter()
                } catch (e) {
                    errorHandler.handleError(e as Error)
                }
            }, argv.mqttPublishInterval * 1000)

            logger.info(`MQTT scheduler started, will publish readings every ${argv.mqttPublishInterval} seconds`)

            // Subscribe to changes and register a handler
            await subscribeToChanges(mqttClient)
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            mqttClient.on('message', async (topicName, payload) => {
                try {
                    await handleMessage(modbusClient, mqttClient, topicName, payload)
                    errorHandler.resetCounter()
                } catch (e) {
                    errorHandler.handleError(e as Error)
                }
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
        }
    }
})()
