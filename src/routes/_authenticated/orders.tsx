import { createFileRoute, redirect } from '@tanstack/react-router'
import { OrdersPage } from '@/features/orders/components/OrdersPage'

export const Route = createFileRoute('/_authenticated/orders')({
  // Old deep links (?order=<id>) now land on the order page.
  validateSearch: (s: Record<string, unknown>): { order?: string } => ({
    ...(typeof s.order === 'string' ? { order: s.order } : {}),
  }),
  beforeLoad: ({ search }) => {
    if (search.order) throw redirect({ to: '/order/$orderId', params: { orderId: search.order }, replace: true })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <OrdersPage />
}
