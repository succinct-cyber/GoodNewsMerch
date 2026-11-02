'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { Order } from '@/types'
import Button from '@/components/ui/Button'

const fmt = (n: number) =>
  `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

function OrderCompleteContent() {
  const params       = useSearchParams()
  const order_number = params.get('order_number') ?? ''
  const payment_id   = params.get('payment_id')   ?? ''

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order-complete', order_number],
    queryFn:  () => api.get(`/orders/complete/?order_number=${order_number}&payment_id=${payment_id}`)
                       .then(r => r.data),
    enabled:  !!order_number,
  })

  if (isLoading) return (
    <div className="max-w-[560px] mx-auto px-4 sm:px-8 py-20 text-center">
      <div className="w-12 h-12 border-4 border-border border-t-black
        rounded-full animate-spin mx-auto" />
    </div>
  )

  if (!order) return (
    <div className="max-w-[560px] mx-auto px-4 sm:px-8 py-20 text-center">
      <p className="text-text-muted">Order not found.</p>
    </div>
  )

  const subtotal = order.products.reduce(
    (s, p) => s + p.product_price * p.quantity, 0
  )

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-border p-10 text-center max-w-[560px] mx-auto">

      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}>
        <CheckCircle className="w-14 h-14 text-success mx-auto mb-4" />
      </motion.div>

      <h1 className="text-[24px] font-bold tracking-[0.2em] uppercase mb-2">
        ORDER CONFIRMED!
      </h1>
      <p className="text-[15px] text-text-body mb-8">
        Thank you, <strong>{order.first_name}</strong>! Your order has been placed successfully.
      </p>

      <div className="bg-section-bg p-5 inline-block min-w-[200px] mb-8">
        <p className="text-[11px] text-text-muted tracking-wide uppercase mb-1">Order Number</p>
        <h2 className="text-[20px] font-bold tracking-[0.2em]">{order.order_number}</h2>
      </div>

      {/* Items */}
      <div className="text-left mb-6">
        <h3 className="text-[12px] font-bold tracking-[0.15em] uppercase text-text-sub mb-3">
          ITEMS ORDERED
        </h3>
        {order.products.map(op => (
          <div key={op.id}
            className="flex justify-between py-3 border-b border-border text-[13px]">
            <div>
              <p className="font-semibold">{op.product.product_name}</p>
              {op.variations.map(v => (
                <p key={v.id} className="text-[11px] text-text-muted capitalize">
                  {v.variation_category}: {v.variation_value}
                </p>
              ))}
              <p className="text-text-muted text-[11px]">Qty: {op.quantity}</p>
            </div>
            <p className="font-semibold">{fmt(op.product_price * op.quantity)}</p>
          </div>
        ))}
        <div className="flex justify-between py-2 text-[13px]">
          <span>Subtotal</span><span>{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between py-2 text-[13px]">
          <span>Tax</span><span>₦0.00</span>
        </div>
        <div className="flex justify-between py-3 font-bold text-[15px]
          border-t border-text mt-1">
          <span>TOTAL PAID</span>
          <span>{fmt(Number(order.order_total))}</span>
        </div>
      </div>

      {/* Delivery */}
      <div className="text-left bg-section-bg p-5 mb-6">
        <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-text-sub mb-2">
          DELIVERY ADDRESS
        </h3>
        <p className="text-[13px] text-text-body leading-relaxed">
          {order.address_line_1}{order.address_line_2 ? `, ${order.address_line_2}` : ''}<br />
          {order.city}, {order.state}<br />
          {order.country}
        </p>
      </div>

      <p className="text-[13px] text-text-muted mb-8">
        A confirmation email has been sent to <strong>{order.email}</strong>.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/dashboard">
          <Button variant="outline">VIEW MY ORDERS</Button>
        </Link>
        <Link href="/shop">
          <Button variant="dark">CONTINUE SHOPPING</Button>
        </Link>
      </div>
    </motion.div>
  )
}

export default function OrderCompletePage() {
  return (
    <section className="py-16 px-8">
      <Suspense fallback={<div className="text-center py-20">Loading…</div>}>
        <OrderCompleteContent />
      </Suspense>
    </section>
  )
}
