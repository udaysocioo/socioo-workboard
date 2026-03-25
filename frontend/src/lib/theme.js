const STORAGE_KEY = 'socioo-theme';

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

export function setTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.style.colorScheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  setTheme(getTheme());
}
