import { validateDevice, parseDevice, ModbusDeviceType, setSetting, getMode, setMode } from '../app/modbus'
import ModbusRTU from 'modbus-serial'

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

describe('get and set mode', () => {
    test('getMode throws on unknown mode', async () => {
        let client: ModbusRTU = {} as any

        await expect(getMode(client, 'foo')).rejects.toThrow('Unknown mode')
    })

    test('setMode throws on unknown mode', async () => {
        let client: ModbusRTU = {} as any

        await expect(setMode(client, 'foo', true)).rejects.toThrow('Unknown mode')
    })
})

describe('setSetting', () => {
    let mockClient: ModbusRTU

    beforeEach(() => {
        mockClient = {
            writeRegister: jest.fn().mockResolvedValue(undefined),
            writeCoil: jest.fn().mockResolvedValue(undefined),
        } as any
    })

    describe('holding register settings (numeric)', () => {
        test('should accept string values for numeric settings', async () => {
            await setSetting(mockClient, 'temperatureTarget', '22.5')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(135, 225) // 22.5 * 10
        })

        test('should parse and round decimal values correctly', async () => {
            await setSetting(mockClient, 'temperatureTarget', '22.0')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(135, 220)

            await setSetting(mockClient, 'temperatureTarget', '18.75')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(135, 188) // rounds to 18.8 * 10

            await setSetting(mockClient, 'temperatureTarget', '18.74')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(135, 187) // rounds to 18.7 * 10
        })

        test('should parse integer strings for settings without decimals', async () => {
            await setSetting(mockClient, 'awayVentilationLevel', '50')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(100, 50)

            await setSetting(mockClient, 'overPressureDelay', '30')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(57, 30)
        })

        test('should truncate decimals for integer-only settings', async () => {
            await setSetting(mockClient, 'awayVentilationLevel', '50.5')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(100, 50) // truncates to 50
        })

        test('should reject boolean values for numeric settings', async () => {
            await expect(setSetting(mockClient, 'temperatureTarget', true)).rejects.toThrow(
                'Setting "temperatureTarget" expects a numeric value, got boolean'
            )
        })

        test('should apply registerScale when set', async () => {
            await setSetting(mockClient, 'awayTemperatureReduction', '5')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(101, 50) // 5 * 10
        })

        test('should not scale when registerScale is not set', async () => {
            await setSetting(mockClient, 'awayVentilationLevel', '75')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(100, 75) // no scaling
        })

        test('should enforce min/max validation', async () => {
            await expect(setSetting(mockClient, 'temperatureTarget', '5')).rejects.toThrow('value 5 below minimum 10')
            await expect(setSetting(mockClient, 'temperatureTarget', '35')).rejects.toThrow('value 35 above maximum 30')
        })

        test('should allow values within min/max range', async () => {
            await setSetting(mockClient, 'temperatureTarget', '20')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(135, 200) // 20 * 10
        })

        test('should accept boundary values for min/max', async () => {
            await setSetting(mockClient, 'temperatureTarget', '10')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(135, 100) // 10 * 10

            await setSetting(mockClient, 'temperatureTarget', '30')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(135, 300) // 30 * 10
        })

        test('should handle settings without min/max', async () => {
            await setSetting(mockClient, 'temperatureControlMode', '2')
            expect(mockClient.writeRegister).toHaveBeenCalledWith(136, 2) // no validation, no scaling
        })
    })

    describe('coil settings (boolean)', () => {
        test('should accept boolean values for coil settings', async () => {
            await setSetting(mockClient, 'coolingAllowed', true)
            expect(mockClient.writeCoil).toHaveBeenCalledWith(52, true)

            await setSetting(mockClient, 'heatingAllowed', false)
            expect(mockClient.writeCoil).toHaveBeenCalledWith(54, false)
        })

        test('should reject string values for coil settings', async () => {
            await expect(setSetting(mockClient, 'coolingAllowed', '1')).rejects.toThrow(
                'Setting "coolingAllowed" expects a boolean value, got string'
            )
        })
    })

    describe('unknown settings', () => {
        test('should reject unknown setting names', async () => {
            await expect(setSetting(mockClient, 'nonExistentSetting', '123')).rejects.toThrow(
                'Unknown setting "nonExistentSetting"'
            )
        })
    })
})
