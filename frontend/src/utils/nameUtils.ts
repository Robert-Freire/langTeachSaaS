export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  return words.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}
