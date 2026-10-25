import { createI18n } from 'vue-i18n';
import de from '@/locales/de';
import en from '@/locales/en';

export const LOCALES = ['en', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language in its own words, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', de: 'Deutsch' };

const STORAGE_KEY = 'locale';

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

// Formats every chart, list and timer uses, so dates and numbers follow the language too
const datetimeFormat = {
  time: { hour: '2-digit', minute: '2-digit' },
  timeSeconds: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  dayMonth: { day: 'numeric', month: 'short' },
  weekday: { weekday: 'short' },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

const numberFormat = {
  precise: { maximumFractionDigits: 1 },
  oneDecimal: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  compact: { notation: 'compact', maximumFractionDigits: 1 },
} satisfies Record<string, Intl.NumberFormatOptions>;

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The language picked before, else the first browser language we have, else English. */
function initialLocale(): Locale {
  const stored = readStored();
  if (isLocale(stored)) return stored;
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  return preferred.map((tag) => tag?.split('-')[0]?.toLowerCase()).find(isLocale) ?? 'en';
}

const locale = initialLocale();
document.documentElement.lang = locale;

export const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'en',
  messages: { en, de },
  datetimeFormats: { en: datetimeFormat, de: datetimeFormat },
  numberFormats: { en: numberFormat, de: numberFormat },
});

/** Switches every page at once and remembers the choice in this browser. */
export function setLocale(next: Locale) {
  i18n.global.locale.value = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode: the choice only lasts until the page reloads
  }
}

declare module 'vue-i18n' {
  // Typed keys for `t` and the format names for `d` / `n`
  export interface DefineLocaleMessage extends Readonly<typeof en> {}
  export interface DefineDateTimeFormat extends Readonly<typeof datetimeFormat> {}
  export interface DefineNumberFormat extends Readonly<typeof numberFormat> {}
}
