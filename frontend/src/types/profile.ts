export interface ProfileDto {
  id: string
  displayName: string
  teachingLanguages: string[]
  cefrLevels: string[]
  preferredStyle: string
  hasCompletedOnboarding: boolean
  hasSettings: boolean
  hasStudents: boolean
  hasLessons: boolean
}

export interface UpdateProfileRequest {
  displayName: string
  teachingLanguages: string[]
  cefrLevels: string[]
  preferredStyle: string
}
