import { validateDevice, parseDevice, MODBUS_DEVICE_TYPE } from '../app/modbus'

test('validateDevice', () => {
    expect(validateDevice('/dev/ttyUSB0')).toEqual(true)
    expect(validateDevice('dev/ttyUSB0')).toEqual(false)
    expect(validateDevice('tcp://192.168.1.40:502')).toEqual(true)
    expect(validateDevice('192.168.1.40:502')).toEqual(false)
})

test('parseDevice', () => {
    expect(parseDevice('/dev/ttyUSB0')).toEqual({
        type: MODBUS_DEVICE_TYPE.RTU,
        path: '/dev/ttyUSB0',
    })
    expect(parseDevice('tcp://localhost:502')).toEqual({
        type: MODBUS_DEVICE_TYPE.TCP,
        hostname: 'localhost',
        port: 502,
    })
    expect(parseDevice('tcp://127.0.0.1:502')).toEqual({
        type: MODBUS_DEVICE_TYPE.TCP,
        hostname: '127.0.0.1',
        port: 502,
    })
})
