import { useQuery } from '@tanstack/react-query'
import { fetchSectionRules } from '../api/pedagogy'

export function useSectionRules() {
  return useQuery({
    queryKey: ['section-rules'],
    queryFn: fetchSectionRules,
    staleTime: Infinity, // Rules are static at runtime
    refetchOnWindowFocus: false,
  })
}
