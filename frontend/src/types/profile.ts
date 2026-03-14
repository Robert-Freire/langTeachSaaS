export interface ProfileDto {
  id: string
  displayName: string
  teachingLanguages: string[]
  cefrLevels: string[]
  preferredStyle: string
}

export interface UpdateProfileRequest {
  displayName: string
  teachingLanguages: string[]
  cefrLevels: string[]
  preferredStyle: string
}
