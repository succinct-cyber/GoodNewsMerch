'use client'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/store/auth'
import api from '@/lib/api'
import { Order } from '@/types'

const fmt = (n: number) =>
  `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

// tracker steps depend on how the order is being delivered
const stepsFor = (delivery: string) =>
  delivery === 'lagos'         ? ['Received', 'Processing', 'Packed', 'With Rider', 'Delivered']
  : delivery === 'outside_lagos' ? ['Received', 'Processing', 'Packed', 'At Park', 'Delivered']
  :                                ['Received', 'Processing', 'Packed', 'Delivered']

const STATUS_COLORS: Record<string, string> = {
  Received:   'bg-blue-100 text-blue-700',
  Processing: 'bg-yellow-100 text-yellow-700',
  Packed:     'bg-orange-100 text-orange-700',
  'With Rider':'bg-purple-100 text-purple-700',
  'At Park':  'bg-purple-100 text-purple-700',
  Delivered:  'bg-green-100 text-green-700',
  Completed:  'bg-green-100 text-green-700',
  Cancelled:  'bg-red-100 text-red-700',
}

export default function OrderDetailPage() {
  const { order_number } = useParams<{ order_number: string }>()
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', order_number],
    queryFn:  () => api.get(`/orders/${order_number}/`).then(r => r.data),
    enabled:  isAuthenticated,
  })

  if (isLoading) return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-8 py-16">
      {[1,2,3].map(i => (
        <div key={i} className="h-20 bg-card-bg animate-pulse rounded mb-4" />
      ))}
    </div>
  )

  if (!order) return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-8 py-20 text-center text-text-muted">
      Order not found.
    </div>
  )

  const subtotal = order.products.reduce(
    (s, p) => s + p.product_price * p.quantity, 0
  )

  const STATUS_STEPS = stepsFor(order.delivery_option)
  // legacy orders were saved as 'Completed' at payment time → treat as finished
  const currentStep = order.status === 'Completed'
    ? STATUS_STEPS.length - 1
    : Math.max(STATUS_STEPS.indexOf(order.status), 0)

  return (
    <div>
      <div>

        {/* Back */}
        <Link href="/dashboard/orders"
          className="inline-flex items-center gap-1 text-[12px] font-semibold
            uppercase tracking-wide text-text-muted hover:text-text
            transition-colors mb-8">
          <ChevronLeft size={14} /> BACK TO ORDERS
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-[22px] font-bold tracking-wide uppercase">
              ORDER DETAILS
            </h1>
            <p className="text-[13px] text-text-muted mt-1 font-mono">
              #{order.order_number}
            </p>
          </div>
          <span className={`inline-block px-3 py-1 text-[11px] font-bold
            tracking-wide uppercase ${STATUS_COLORS[order.status] ?? 'bg-section-bg text-text-muted'}`}>
            {order.status}
          </span>
        </div>

        {/* Status Tracker */}
        {order.status !== 'Cancelled' && (
          <div className="bg-white border border-border p-6 mb-6">
            <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-text-sub mb-5">
              ORDER PROGRESS
            </p>
            <div className="flex items-center gap-0">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center
                        text-[11px] font-bold border-2 transition-all
                        ${i <= currentStep
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-text-muted border-border'}`}>
                      {i < currentStep ? '✓' : i + 1}
                    </motion.div>
                    <span className={`text-[10px] font-semibold tracking-wide whitespace-nowrap
                      ${i <= currentStep ? 'text-text' : 'text-text-muted'}`}>
                      {step.toUpperCase()}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-[2px] mx-1 transition-colors
                      ${i < currentStep ? 'bg-black' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">

          {/* Items */}
          <div>
            <div className="bg-white border border-border p-6 mb-4">
              <p className="text-[11px] font-bold tracking-[0.15em] uppercase
                text-text-sub mb-4">ORDER ITEMS</p>
              {order.products.map(op => (
                <div key={op.id}
                  className="flex items-start gap-4 py-4 border-b border-border last:border-0">
                  <div className="relative w-16 h-16 bg-card-bg flex-shrink-0">
                    {op.product.images && (
                      <Image src={op.product.images}
                        alt={op.product.product_name}
                        fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold">{op.product.product_name}</p>
                    {op.variations.map(v => (
                      <p key={v.id} className="text-[11px] text-text-muted capitalize">
                        {v.variation_category}: {v.variation_value}
                      </p>
                    ))}
                    <p className="text-[11px] text-text-muted">Qty: {op.quantity}</p>
                  </div>
                  <p className="text-[13px] font-semibold whitespace-nowrap">
                    {fmt(op.product_price * op.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-white border border-border p-6">
              <div className="flex justify-between text-[13px] py-2 border-b border-border">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] py-2 border-b border-border">
                <span>Shipping</span>
                <span>{order.shipping_fee > 0 ? fmt(order.shipping_fee) : 'Free'}</span>
              </div>
              <div className="flex justify-between text-[13px] py-2 border-b border-border">
                <span>Tax</span><span>₦0.00</span>
              </div>
              <div className="flex justify-between font-bold text-[16px] pt-3">
                <span>TOTAL PAID</span>
                <span>{fmt(Number(order.order_total))}</span>
              </div>
            </div>
          </div>

          {/* Sidebar info */}
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-border p-5">
              <p className="text-[11px] font-bold tracking-[0.15em] uppercase
                text-text-sub mb-3">DELIVERY ADDRESS</p>
              <p className="text-[13px] text-text-body leading-relaxed">
                {order.first_name} {order.last_name}<br />
                {order.address_line_1}
                {order.address_line_2 && <><br />{order.address_line_2}</>}<br />
                {order.city}, {order.state}<br />
                {order.country}<br />
                {order.phone}
              </p>
            </div>

            <div className="bg-white border border-border p-5">
              <p className="text-[11px] font-bold tracking-[0.15em] uppercase
                text-text-sub mb-3">DELIVERY METHOD</p>
              <p className="text-[13px] text-text-body capitalize">
                {order.delivery_option.replace(/_/g, ' ')}
              </p>
            </div>

            {order.order_note && (
              <div className="bg-white border border-border p-5">
                <p className="text-[11px] font-bold tracking-[0.15em] uppercase
                  text-text-sub mb-2">ORDER NOTE</p>
                <p className="text-[13px] text-text-body">{order.order_note}</p>
              </div>
            )}

            <div className="bg-white border border-border p-5">
              <p className="text-[11px] font-bold tracking-[0.15em] uppercase
                text-text-sub mb-3">ORDER DATE</p>
              <p className="text-[13px] text-text-body">
                {new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
