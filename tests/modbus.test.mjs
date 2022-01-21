import {
    parseTemperature,
    createModelNameString, parseAlarmTimestamp
} from '../app/modbus.mjs'

test('parse temperature', () => {
    // Positive, float
    expect(parseTemperature(171)).toEqual(17.1)
    // Negative, integer
    expect(parseTemperature(65486)).toEqual(-5)
})

test('create model name from device information', () => {
    // Heating, no cooling, DC fan
    expect(createModelNameString({
        familyType: 'Pingvin',
        fanType: 'EC',
        heatingTypeInstalled: 'EDE',
        coolingTypeInstalled: null,
    })).toEqual('Pingvin eco EDE')

    // Heating, cooling, DC fan
    expect(createModelNameString({
        familyType: 'Pegasus',
        fanType: 'EC',
        heatingTypeInstalled: 'EDE',
        coolingTypeInstalled: 'CG',
    })).toEqual('Pegasus eco EDE - CG')

    // No heating, no cooling, AC fan
    expect(createModelNameString({
        familyType: 'Pandion',
        fanType: 'AC',
        heatingTypeInstalled: null,
        coolingTypeInstalled: null,
    })).toEqual('Pandion')
})

test('parse alarm timestamp', () => {
    const alarmResult = {
        data: [
            10, // type
            2, // state,
            22, // year
            1, // month
            21, // day
            13, // hour
            45, // minute
        ]
    }

    const timestamp = parseAlarmTimestamp(alarmResult)

    // 13:45 GMT+2 == 11:45 UTC
    expect(timestamp.toISOString()).toEqual('2022-01-21T11:45:00.000Z')
})
