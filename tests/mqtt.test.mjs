import { validateBrokerUrl } from '../app/mqtt.mjs'

test('validateMqttUrl', () => {
    expect(validateBrokerUrl('mqtt://localhost:1883')).toEqual(true)
    expect(validateBrokerUrl('mqtts://localhost:1883')).toEqual(true)
    expect(validateBrokerUrl('mqtt://localhost')).toEqual(true)
    expect(validateBrokerUrl('localhost:1883')).toEqual(false)
    expect(validateBrokerUrl('localhost')).toEqual(false)
})
