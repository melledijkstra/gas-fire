export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'ymyl-mobile-theme'

export const themeState = $state<{
  preference: ThemePreference
  resolvedDark: boolean
}>({
  preference: 'system',
  resolvedDark: false,
})

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyThemeToDocument(): void {
  const isDark = themeState.preference === 'dark'
    || (themeState.preference === 'system' && getSystemPrefersDark())
  themeState.resolvedDark = isDark

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark)
  }
}

export function initTheme(): () => void {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null
    if (isThemePreference(saved)) {
      themeState.preference = saved
    }
  }
  catch {
    // Ignore storage access errors in restricted iframes
  }

  applyThemeToDocument()

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = () => {
    if (themeState.preference === 'system') {
      applyThemeToDocument()
    }
  }
  mediaQuery.addEventListener('change', handleChange)
  return () => mediaQuery.removeEventListener('change', handleChange)
}

export function cycleThemePreference(): void {
  const order: ThemePreference[] = ['system', 'light', 'dark']
  const nextIndex = (order.indexOf(themeState.preference) + 1) % order.length
  themeState.preference = order[nextIndex]

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, themeState.preference)
    }
  }
  catch {
    // Ignore storage access errors
  }

  applyThemeToDocument()
}
