import { randomBytes } from 'crypto'

/**
 * Generates a unique entry code like MKD-A3F9X2
 * Uses crypto.randomBytes for non-guessability
 */
export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1 to avoid confusion
  const bytes = randomBytes(6)
  let code = 'MKD-'
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length]
  }
  return code
}
