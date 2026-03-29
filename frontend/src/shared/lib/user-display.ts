export function userDisplayLabel(u: {
  fullName: string | null
  email: string
}): string {
  const n = u.fullName?.trim()
  return n || u.email
}
