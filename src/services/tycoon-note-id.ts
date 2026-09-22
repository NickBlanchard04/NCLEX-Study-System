export async function getTycoonPatientNoteId(shiftId: string, patientId: string): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error('Secure note storage is unavailable in this browser.')

  const identity = JSON.stringify(['nurse-command-tycoon-patient-note', shiftId, patientId])
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(identity),
  )
  const bytes = new Uint8Array(digest).slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x80
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
