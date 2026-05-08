import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RedaccionDetail() {
  const { correctionId } = useParams<{ id: string; correctionId: string }>()
  const navigate = useNavigate()

  return (
    <div className="space-y-6" data-testid="redaccion-detail-placeholder">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="font-manrope text-[3.5rem] font-bold text-[#1A1B22] leading-tight">
          Próximamente
        </p>
        <p className="text-sm text-zinc-500 max-w-md">
          La vista detallada de la redacción aún no está disponible. Aparecerá aquí cuando esté lista.
        </p>
        {correctionId && <p className="text-xs text-zinc-400">ID: {correctionId}</p>}
      </div>
    </div>
  )
}
