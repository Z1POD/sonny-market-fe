import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CheckOut } from '@/features/checkout/components/CheckOut'
import { useCheckoutStore } from '@/features/checkout/store'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: RouteComponent,
})

function RouteComponent() {
  const isOpen = useCheckoutStore((s) => s.isOpen)
  const navigate = useNavigate()
  // Opened directly (refresh / old link) with nothing in the checkout: go shopping.
  useEffect(() => {
    if (!useCheckoutStore.getState().isOpen) navigate({ to: '/marketplace', replace: true })
  }, [navigate])
  return isOpen ? <CheckOut /> : null
}
