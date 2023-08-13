import { validateBrokerUrl } from '../app/mqtt.mjs'

test('validateMqttUrl', () => {
    expect(validateBrokerUrl('tcp://localhost:1883')).toEqual(true)
    expect(validateBrokerUrl('tcp://localhost')).toEqual(true)
    expect(validateBrokerUrl('localhost:1883')).toEqual(false)
    expect(validateBrokerUrl('localhost')).toEqual(false)
})
