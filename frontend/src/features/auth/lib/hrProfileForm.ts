export type HrProfileFormValues = {
  fullName: string
  employeeCode: string
  gender: '' | 'male' | 'female' | 'other'
  dateOfBirth: string
  avatar: string
}

export function hrProfilePayload(p: HrProfileFormValues) {
  return {
    fullName: p.fullName.trim(),
    employeeCode: p.employeeCode.trim(),
    gender: p.gender,
    dateOfBirth: p.dateOfBirth,
    avatar: p.avatar.trim() || undefined,
  }
}

export const hrProfileDefaultValues: HrProfileFormValues = {
  fullName: '',
  employeeCode: '',
  gender: '',
  dateOfBirth: '',
  avatar: '',
}
