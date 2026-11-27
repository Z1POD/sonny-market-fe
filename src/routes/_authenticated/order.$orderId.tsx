import { createFileRoute } from '@tanstack/react-router'
import { OrderDetailPage } from '@/features/orders/components/OrderDetailPage'

export const Route = createFileRoute('/_authenticated/order/$orderId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { orderId } = Route.useParams()
  return <OrderDetailPage key={orderId} orderId={orderId} />
}
