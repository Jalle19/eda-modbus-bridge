import yargs from 'yargs'

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
            default: 1,
            alias: 's',
        },
        'modbusTimeout': {
            description: 'The timeout for Modbus operations (in seconds)',
            type: 'number',
            default: 5,
            alias: 't',
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
        'mqttTopicPrefix': {
            description: 'The prefix to use for MQTT topics',
            type: 'string',
            default: 'eda',
            alias: 'P',
        },
        'debug': {
            description: 'Enable debug logging',
            type: 'boolean',
            default: false,
            alias: 'v',
        },
    })
    .parserConfiguration({
        // Protect against weird things happening if someone accidentally uses "-option" instead of "--option"
        'short-option-groups': false,
        'duplicate-arguments-array': false,
    })

const defaultArgvForTests = {
    mqttTopicPrefix: 'eda',
}

export const argv = process.env.NODE_ENV !== 'test' ? parserConfiguration.parseSync() : defaultArgvForTests
