export const getBrowserLocale = () => {
  if (navigator.languages != undefined && navigator.languages.length > 0) {
    return navigator.languages[0]
  }
  return navigator.language
}
