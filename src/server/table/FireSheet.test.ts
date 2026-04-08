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
})
