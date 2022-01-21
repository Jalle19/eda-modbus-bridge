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

    // The ventilation unit is assumed to be using the same timezone as the computer running this software,
    // i.e. the result from Modbus is in local time.
    expect(timestamp.toLocaleString('fi-FI')).toEqual('21.1.2022 klo 13.45.00')
    expect(timestamp.toLocaleString('en-US')).toEqual('1/21/2022, 1:45:00 PM')
})
