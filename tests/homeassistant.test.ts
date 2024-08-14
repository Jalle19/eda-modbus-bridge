import { createDeviceIdentifierString } from '../app/homeassistant'

test('createDeviceIdentifierString', () => {
    const deviceInformation = {
        'modelType': 'Pingvin',
        'fanType': 'EC',
    }

    expect(createDeviceIdentifierString(deviceInformation)).toEqual('enervent-pingvin-ec')
})
