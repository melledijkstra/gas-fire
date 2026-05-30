import { generateCellData } from './FireSheet'

describe('generateCellData', () => {
  test('should convert a string to userEnteredValue.stringValue', () => {
    expect(generateCellData('Hello')).toEqual({
      userEnteredValue: { stringValue: 'Hello' },
    })
  })

  test('should convert a Date to userEnteredValue.numberValue and send as UTC', () => {
    const expected = new Date(Date.UTC(2024, 0, 1)).getTime() / (24 * 60 * 60 * 1000) + 25569 // Convert to Sheets date number
    expect(generateCellData(new Date(Date.UTC(2024, 0, 1)))).toEqual({
      userEnteredValue: { numberValue: expected },
    })
  })

  test('should prepend single quote for strings starting with formula characters (CSV injection prevention)', () => {
    expect(generateCellData('=1+1')).toEqual({
      userEnteredValue: { stringValue: '\'=1+1' },
    })
    expect(generateCellData('+A1')).toEqual({
      userEnteredValue: { stringValue: '\'+A1' },
    })
    expect(generateCellData('-B2')).toEqual({
      userEnteredValue: { stringValue: '\'-B2' },
    })
    expect(generateCellData('@SUM(A1:A10)')).toEqual({
      userEnteredValue: { stringValue: '\'@SUM(A1:A10)' },
    })
  })
})
