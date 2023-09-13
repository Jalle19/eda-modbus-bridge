import { getProSize, UNIT_TYPE_FAMILY, UNIT_TYPE_PRO } from '../app/enervent.mjs'

test('getProSize', () => {
    expect(getProSize(UNIT_TYPE_FAMILY, 'Pingvin', 0)).toEqual(0)
    expect(getProSize(UNIT_TYPE_PRO, 'RS', 2)).toEqual(25)
    expect(getProSize(UNIT_TYPE_PRO, 'LTT', 6)).toEqual(90)
})
