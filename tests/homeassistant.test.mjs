import { createDeviceIdentifierString } from '../app/homeassistant.mjs'

test('createDeviceIdentifierString', () => {
    const deviceInformation = {
        'modelType': 'Pingvin',
        'fanType': 'EC',
    }

    expect(createDeviceIdentifierString(deviceInformation)).toEqual('enervent-pingvin-ec')
})
