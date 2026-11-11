const LOWERCASE_WORDS = new Set([
  'ke', 'menuju', 'di', 'dari', 'dan', 'dengan', 'untuk',
  'pada', 'saat', 'sebelum', 'setelah', 'atau', 'yang',
])

export function formatTitleText(value) {
  let isFirstWord = true

  return String(value || '').trim().split(/(\s+|—)/).map(part => {
    if (!part.trim() || part === '—') return part
    const lower = part.toLowerCase()
    if (!isFirstWord && LOWERCASE_WORDS.has(lower)) {
      isFirstWord = false
      return lower
    }
    isFirstWord = false
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }).join('')
}
