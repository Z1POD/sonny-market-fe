import { createFileRoute } from '@tanstack/react-router'
import { StudioPage } from '@/features/studio/components/StudioPage'

export const Route = createFileRoute('/_authenticated/studio')({
  // blank: slug of the blank product to open · from: published product it was launched from · color: preferred hex
  validateSearch: (s: Record<string, unknown>): { blank?: string; from?: string; color?: string } => ({
    ...(typeof s.blank === 'string' ? { blank: s.blank } : {}),
    ...(typeof s.from === 'string' ? { from: s.from } : {}),
    ...(typeof s.color === 'string' ? { color: s.color } : {}),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <StudioPage />
}
