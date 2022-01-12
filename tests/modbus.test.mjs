import {
    parseTemperature,
    createModelNameString
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
