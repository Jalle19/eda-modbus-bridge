import { createDeviceIdentifierString } from '../app/homeassistant'
import { DeviceInformation } from '../app/enervent'

test('createDeviceIdentifierString', () => {
    const deviceInformation: Partial<DeviceInformation> = {
        'modelType': 'Pingvin',
        'fanType': 'EC',
    }

    expect(createDeviceIdentifierString(deviceInformation)).toEqual('enervent-pingvin-ec')
})
