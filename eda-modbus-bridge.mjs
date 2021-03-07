import express from 'express'
import morgan from 'morgan'
import yargs from 'yargs'
import ModbusRTU from 'modbus-serial'
import {getFlagStatus, root, setFlagStatus, setSetting, summary} from './app/handlers.mjs'

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
        }
    })
    .argv;

(async () => {
    console.log(`Opening serial connection to ${argv.device}, slave ID ${argv.modbusSlave}`)
    const modbusClient = new ModbusRTU()
    modbusClient.setID(argv.modbusSlave)
    await modbusClient.connectRTUBuffered(argv.device, {
        baudRate: 19200,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
    })

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
})();