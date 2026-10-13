import yargs from 'yargs'

type Configuration = {
    device: string
    modbusSlave: number
    modbusTimeout: number
    http: boolean
    httpListenAddress: string
    httpPort: number
    mqttBrokerUrl?: string
    mqttUsername?: string
    mqttPassword?: string
    mqttPublishInterval: number
    mqttDiscovery: boolean
    mqttTopicPrefix: string
    debug: boolean
}

const defaults: Partial<Configuration> = {
    modbusSlave: 1,
    modbusTimeout: 5,
    http: true,
    httpListenAddress: '0.0.0.0',
    httpPort: 8080,
    mqttPublishInterval: 10,
    mqttDiscovery: true,
    mqttTopicPrefix: 'eda',
    debug: false,
}

const parserConfiguration = yargs(process.argv.slice(2))
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
            default: defaults.modbusSlave as number,
            alias: 's',
        },
        'modbusTimeout': {
            description: 'The timeout for Modbus operations (in seconds)',
            type: 'number',
            default: defaults.modbusTimeout as number,
            alias: 't',
        },
        'http': {
            description: 'Whether to enable the HTTP server or not',
            type: 'boolean',
            default: defaults.http as boolean,
        },
        'httpListenAddress': {
            description: 'The address to listen (HTTP)',
            type: 'string',
            default: defaults.httpListenAddress as string,
            alias: 'a',
        },
        'httpPort': {
            description: 'The port to listen on (HTTP)',
            type: 'number',
            default: defaults.httpPort as number,
            alias: 'p',
        },
        'mqttBrokerUrl': {
            description: 'The URL to the MQTT broker, e.g. mqtt://localhost:1883. Omit to disable MQTT support.',
            type: 'string',
            alias: 'm',
        },
        'mqttUsername': {
            description: 'The username to use when connecting to the MQTT broker. Omit to disable authentication.',
            type: 'string',
        },
        'mqttPassword': {
            description:
                'The password to use when connecting to the MQTT broker. Required when mqttUsername is defined. Omit to disable authentication.',
            type: 'string',
        },
        'mqttPublishInterval': {
            description: 'How often messages should be published over MQTT (in seconds)',
            type: 'number',
            default: defaults.mqttPublishInterval as number,
            alias: 'i',
        },
        'mqttDiscovery': {
            description:
                'Whether to enable Home Assistant MQTT discovery support. Only effective when mqttBrokerUrl is defined.',
            type: 'boolean',
            default: defaults.mqttDiscovery as boolean,
        },
        'mqttTopicPrefix': {
            description: 'The prefix to use for MQTT topics',
            type: 'string',
            default: defaults.mqttTopicPrefix as string,
            alias: 'P',
        },
        'debug': {
            description: 'Enable debug logging',
            type: 'boolean',
            default: defaults.debug as boolean,
            alias: 'v',
        },
    })
    .parserConfiguration({
        // Protect against weird things happening if someone accidentally uses "-option" instead of "--option"
        'short-option-groups': false,
        'duplicate-arguments-array': false,
    })

export const argv: Configuration =
    process.env.NODE_ENV !== 'test'
        ? {
              ...parserConfiguration.parseSync(),
          }
        : (defaults as Configuration)
