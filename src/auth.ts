import type { AuthUser } from './types'

const ACCOUNTS_KEY = 'taskflow-pro.auth.accounts.v1'
const LOCAL_SESSION_KEY = 'taskflow-pro.auth.session.v1'
const TAB_SESSION_KEY = 'taskflow-pro.auth.tab-session.v1'
const HASH_ITERATIONS = 210_000
const HASH_LENGTH = 256

interface StoredAccount extends AuthUser {
  salt: string
  passwordHash: string
  iterations: number
}

interface StoredSession {
  userId: string
}

function isStoredAccount(value: unknown): value is StoredAccount {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string' &&
    'email' in value && typeof value.email === 'string' &&
    'salt' in value && typeof value.salt === 'string' &&
    'passwordHash' in value && typeof value.passwordHash === 'string' &&
    'iterations' in value && typeof value.iterations === 'number'
}

function toBase64(value: Uint8Array) {
  let binary = ''
  value.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function hashPassword(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const saltBuffer = new ArrayBuffer(salt.byteLength)
  new Uint8Array(saltBuffer).set(salt)
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations }, key, HASH_LENGTH)
  return new Uint8Array(bits)
}

function readAccounts() {
  const stored = localStorage.getItem(ACCOUNTS_KEY)
  if (!stored) return []
  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed) || !parsed.every(isStoredAccount)) {
    throw new Error('Saved demo account data is invalid. Clear the TaskFlow Pro demo-auth storage to continue.')
  }
  return parsed
}

export function getActiveSession(): AuthUser | null {
  try {
    const stored = localStorage.getItem(LOCAL_SESSION_KEY) ?? sessionStorage.getItem(TAB_SESSION_KEY)
    if (!stored) return null
    const session: unknown = JSON.parse(stored)
    if (typeof session !== 'object' || session === null || !('userId' in session) || typeof session.userId !== 'string') {
      throw new Error('Saved demo session data is invalid.')
    }
    const account = readAccounts().find((candidate) => candidate.id === session.userId)
    if (!account) return null
    return { id: account.id, name: account.name, email: account.email }
  } catch (error) {
    console.error('Unable to restore the local demo session.', error)
    return null
  }
}

export function endSession() {
  localStorage.removeItem(LOCAL_SESSION_KEY)
  sessionStorage.removeItem(TAB_SESSION_KEY)
}

export async function registerAccount(name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const accounts = readAccounts()
  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error('An account with this email already exists. Log in instead.')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const passwordHash = await hashPassword(password, salt, HASH_ITERATIONS)
  const user: StoredAccount = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    salt: toBase64(salt),
    passwordHash: toBase64(passwordHash),
    iterations: HASH_ITERATIONS,
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, user]))
  return { id: user.id, name: user.name, email: user.email }
}

export async function authenticateAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const account = readAccounts().find((candidate) => candidate.email === normalizedEmail)
  if (!account) throw new Error('We couldn’t find an account with that email. Check it or create an account.')
  const candidateHash = await hashPassword(password, fromBase64(account.salt), account.iterations)
  const storedHash = fromBase64(account.passwordHash)
  const mismatch = candidateHash.length ^ storedHash.length
  let difference = mismatch
  for (let index = 0; index < Math.min(candidateHash.length, storedHash.length); index += 1) {
    difference |= candidateHash[index] ^ storedHash[index]
  }
  if (difference !== 0) throw new Error('That password doesn’t match this email. Please try again.')
  return { id: account.id, name: account.name, email: account.email }
}

export function startSession(user: AuthUser, remember: boolean) {
  const session: StoredSession = { userId: user.id }
  const serialized = JSON.stringify(session)
  if (remember) {
    sessionStorage.removeItem(TAB_SESSION_KEY)
    localStorage.setItem(LOCAL_SESSION_KEY, serialized)
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY)
    sessionStorage.setItem(TAB_SESSION_KEY, serialized)
  }
}
