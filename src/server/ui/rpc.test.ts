import { DIALOG_SIZES } from '@/common/settings'
import { doGet, onOpen, openMobileBudgetDialog } from './rpc'

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

  test('openMobileBudgetDialog opens modal dialog with configured mobileBudget size', () => {
    const showModalDialogMock = vi.fn()
    vi.spyOn(SpreadsheetApp, 'getUi').mockReturnValueOnce({
      showModalDialog: showModalDialogMock,
    } as unknown as GoogleAppsScript.Base.Ui)

    openMobileBudgetDialog()

    const [expectedWidth, expectedHeight] = DIALOG_SIZES.mobileBudget
    expect(createTemplateFromFileMock).toHaveBeenCalledWith('mobile-budget-dialog')
    expect(setWidthMock).toHaveBeenCalledWith(expectedWidth)
    expect(setHeightMock).toHaveBeenCalledWith(expectedHeight)
    expect(showModalDialogMock).toHaveBeenCalledWith(expect.anything(), 'Mobile Budget App')
  })

  test('onOpen registers Mobile Budget App in the YMYL menu', () => {
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
    expect(addItemMock).toHaveBeenCalledWith('Mobile Budget App', 'openMobileBudgetDialog')
    expect(addToUiMock).toHaveBeenCalledTimes(1)
  })
})
