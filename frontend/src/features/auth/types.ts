export type AuthUser = {
  id: string
  email: string
  emailVerified: boolean
  hasPassword: boolean
  hasGoogle: boolean
  fullName: string | null
  employeeCode: string | null
  gender: string | null
  dateOfBirth: string | null
  avatar: string | null
  role: 'admin' | 'staff'
}
