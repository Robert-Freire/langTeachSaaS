import { apiClient } from '../lib/apiClient'

export interface Material {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  previewUrl: string | null
  createdAt: string
}

export async function uploadMaterial(lessonId: string, sectionId: string, file: File): Promise<Material> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post<Material>(
    `/api/lessons/${lessonId}/sections/${sectionId}/materials`,
    formData
  )
  return res.data
}

export async function deleteMaterial(lessonId: string, sectionId: string, materialId: string): Promise<void> {
  await apiClient.delete(`/api/lessons/${lessonId}/sections/${sectionId}/materials/${materialId}`)
}

export async function listMaterials(lessonId: string, sectionId: string): Promise<Material[]> {
  const res = await apiClient.get<Material[]>(`/api/lessons/${lessonId}/sections/${sectionId}/materials`)
  return res.data
}
