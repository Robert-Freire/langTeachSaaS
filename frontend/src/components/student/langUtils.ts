export const LANG_TO_CODE: Record<string, string> = {
  English: 'EN', Spanish: 'ES', French: 'FR', German: 'DE',
  Italian: 'IT', Portuguese: 'PT', Mandarin: 'ZH', Japanese: 'JA',
  Arabic: 'AR', Catalan: 'CA', Other: '??',
}

export function langCode(lang: string): string {
  return LANG_TO_CODE[lang] ?? lang.slice(0, 2).toUpperCase()
}
