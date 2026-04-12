import { LANG_TO_CODE } from '@/lib/languages'

export function langCode(lang: string): string {
  return LANG_TO_CODE[lang] ?? lang.slice(0, 2).toUpperCase()
}
