import { validateDevice, parseDevice, ModbusDeviceType, parseSettingValue } from '../app/modbus'

test('validateDevice', () => {
    expect(validateDevice('/dev/ttyUSB0')).toEqual(true)
    expect(validateDevice('dev/ttyUSB0')).toEqual(false)
    expect(validateDevice('tcp://192.168.1.40:502')).toEqual(true)
    expect(validateDevice('192.168.1.40:502')).toEqual(false)
})

test('parseDevice', () => {
    expect(parseDevice('/dev/ttyUSB0')).toEqual({
        type: ModbusDeviceType.RTU,
        path: '/dev/ttyUSB0',
    })
    expect(parseDevice('tcp://localhost:502')).toEqual({
        type: ModbusDeviceType.TCP,
        hostname: 'localhost',
        port: 502,
    })
    expect(parseDevice('tcp://127.0.0.1:502')).toEqual({
        type: ModbusDeviceType.TCP,
        hostname: '127.0.0.1',
        port: 502,
    })
})

test('parseSettingValue', () => {
    // Settings with decimals should parse floats
    expect(parseSettingValue('temperatureTarget', '22.0')).toEqual(22)
    expect(parseSettingValue('temperatureTarget', '22')).toEqual(22)
    expect(parseSettingValue('temperatureTarget', '22.5')).toEqual(22.5)
    expect(parseSettingValue('temperatureTarget', '18.75')).toEqual(18.8)
    expect(parseSettingValue('temperatureTarget', '18.74')).toEqual(18.7)

    // Settings without decimals should parse integers (truncates decimals)
    expect(parseSettingValue('awayVentilationLevel', '50.5')).toEqual(50)
    expect(parseSettingValue('awayVentilationLevel', '50')).toEqual(50)
    expect(parseSettingValue('overPressureDelay', '30')).toEqual(30)
})
