const OWNER_KEY = 'taskflow-pro.local-data.owner.v1'

export function scopedStorageKey(area: string, version: number, userId: string) {
  return `taskflow-pro.${area}.v${version}.user.${encodeURIComponent(userId)}`
}

export function readUserStorage(userId: string, scopedKey: string, legacyKeys: string[]) {
  const scopedValue = localStorage.getItem(scopedKey)
  if (scopedValue !== null) return scopedValue

  const owner = localStorage.getItem(OWNER_KEY)
  if (owner && owner !== userId) return null

  for (const legacyKey of legacyKeys) {
    const legacyValue = localStorage.getItem(legacyKey)
    if (legacyValue !== null) {
      localStorage.setItem(OWNER_KEY, userId)
      localStorage.setItem(scopedKey, legacyValue)
      return legacyValue
    }
  }

  if (!owner) localStorage.setItem(OWNER_KEY, userId)
  return null
}

export function claimDemoSeed(userId: string, area: string) {
  if (localStorage.getItem(OWNER_KEY) !== userId) return false
  const seedKey = `taskflow-pro.local-data.seeded.${encodeURIComponent(userId)}.${area}`
  if (localStorage.getItem(seedKey)) return false
  localStorage.setItem(seedKey, 'true')
  return true
}
