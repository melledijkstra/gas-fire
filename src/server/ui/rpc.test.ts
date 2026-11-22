import { doGet, onOpen } from './rpc'

describe('UI RPC functions', () => {
  const addMetaTagMock = vi.fn().mockReturnThis()
  const setTitleMock = vi.fn().mockReturnThis()
  const setHeightMock = vi.fn().mockReturnThis()
  const setWidthMock = vi.fn().mockReturnThis()
  const evaluateMock = vi.fn(() => ({
    setWidth: setWidthMock,
    setHeight: setHeightMock,
    setTitle: setTitleMock,
    addMetaTag: addMetaTagMock,
  }))
  const createTemplateFromFileMock = vi.fn(() => ({
    evaluate: evaluateMock,
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('HtmlService', {
      createTemplateFromFile: createTemplateFromFileMock,
    })
  })

  test('doGet creates mobile-budget-dialog template with viewport meta tag and title', () => {
    doGet()

    expect(createTemplateFromFileMock).toHaveBeenCalledWith('mobile-budget-dialog')
    expect(setTitleMock).toHaveBeenCalledWith('YMYL Mobile Budget')
    expect(addMetaTagMock).toHaveBeenCalledWith('viewport', 'width=device-width, initial-scale=1')
  })

  test('onOpen builds YMYL menu without desktop Mobile Budget App launcher', () => {
    const addItemMock = vi.fn().mockReturnThis()
    const addSubMenuMock = vi.fn().mockReturnThis()
    const addToUiMock = vi.fn()
    const createMenuMock = vi.fn(() => ({
      addItem: addItemMock,
      addSubMenu: addSubMenuMock,
      addToUi: addToUiMock,
    }))

    vi.spyOn(SpreadsheetApp, 'getUi').mockReturnValueOnce({
      createMenu: createMenuMock,
    } as unknown as GoogleAppsScript.Base.Ui)

    onOpen()

    expect(createMenuMock).toHaveBeenCalledWith('YMYL')
    expect(addItemMock).not.toHaveBeenCalledWith('Mobile Budget App', expect.anything())
    expect(addToUiMock).toHaveBeenCalledTimes(1)
  })
})
