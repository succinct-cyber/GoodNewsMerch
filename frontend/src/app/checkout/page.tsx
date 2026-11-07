'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useCart } from '@/store/cart'
import { useAuth } from '@/store/auth'
import api from '@/lib/api'
import Button from '@/components/ui/Button'

const DELIVERY = [
  { value: 'pickup',       label: 'Pick Up Station — Free',
    sub: 'CAC Goodnews Assembly, 24 Majaro Street, Pero Bus Stop, Agege, Lagos',
    fee: 0 },
  { value: 'lagos',        label: 'Door / Park Delivery (Lagos) — ₦4,000', fee: 4000 },
  { value: 'outside_lagos',label: 'Park Delivery (Outside Lagos) — ₦6,000', fee: 6000 },
]

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

export default function CheckoutPage() {
  const { items, fetchCart, total } = useCart()
  const { user, isAuthenticated }   = useAuth()
  const router                      = useRouter()
  const [delivery, setDelivery]     = useState('pickup')
  const [loading, setLoading]       = useState(false)
  const [error,   setError]         = useState('')

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    email: '', address_line_1: '', address_line_2: '',
    city: '', state: '', country: 'Nigeria', order_note: '',
    payment_method: 'flutterwave',
  })

  useEffect(() => {
    fetchCart()
    if (user) setForm(f => ({
      ...f,
      first_name: user.first_name,
      last_name:  user.last_name,
      email:      user.email,
      phone:      user.phone_number ?? '',
    }))
  }, [user])

  const shippingFee = DELIVERY.find(d => d.value === delivery)?.fee ?? 0
  const subtotal    = total()
  const grandTotal  = subtotal + shippingFee

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/orders/place/', {
        ...form,
        delivery_option: delivery,
      })
      // Store order info for payment page
      sessionStorage.setItem('pending_order', JSON.stringify({
        order_number: data.order_number,
        grand_total:  data.grand_total,
        shipping_fee: data.shipping_fee,
        tax:          data.tax,
        email:        form.email,
        name:         `${form.first_name} ${form.last_name}`,
        phone:        form.phone,
        payment_method: form.payment_method,
      }))
      router.push('/payment')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
        <h1 className="text-[28px] font-bold tracking-[0.2em] uppercase mb-10">CHECKOUT</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">

          {/* Form */}
          <form onSubmit={handleSubmit} id="checkout-form">
            <h2 className="text-[11px] font-bold tracking-[0.15em] uppercase
              text-text-sub pb-3 mb-6 border-b-2 border-black">
              DELIVERY INFORMATION
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { name: 'first_name', label: 'First Name', type: 'text' },
                { name: 'last_name',  label: 'Last Name',  type: 'text' },
              ].map(f => (
                <div key={f.name} className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                    {f.label}
                  </label>
                  <input required name={f.name} type={f.type}
                    value={(form as any)[f.name]}
                    onChange={handleChange}
                    className="border-b border-text bg-transparent py-3 text-[14px]
                      outline-none focus:border-black transition-colors" />
                </div>
              ))}
            </div>

            {[
              { name: 'phone',         label: 'Phone Number',   type: 'tel' },
              { name: 'email',         label: 'Email Address',  type: 'email' },
              { name: 'address_line_1',label: 'Address Line 1', type: 'text' },
              { name: 'address_line_2',label: 'Address Line 2 (optional)', type: 'text', required: false },
            ].map(f => (
              <div key={f.name} className="mb-5 flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                  {f.label}
                </label>
                <input name={f.name} type={f.type}
                  required={f.required !== false}
                  value={(form as any)[f.name]}
                  onChange={handleChange}
                  className="border-b border-text bg-transparent py-3 text-[14px]
                    outline-none focus:border-black transition-colors" />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4 mb-5">
              {['city','state'].map(name => (
                <div key={name} className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </label>
                  <input required name={name} value={(form as any)[name]}
                    onChange={handleChange}
                    className="border-b border-text bg-transparent py-3 text-[14px]
                      outline-none focus:border-black transition-colors" />
                </div>
              ))}
            </div>

            <div className="mb-5 flex flex-col gap-1">
              <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                Country
              </label>
              <input name="country" value={form.country} onChange={handleChange}
                className="border-b border-text bg-transparent py-3 text-[14px]
                  outline-none focus:border-black transition-colors" />
            </div>

            <div className="mb-5 flex flex-col gap-1">
              <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                Order Notes (optional)
              </label>
              <textarea name="order_note" rows={3} value={form.order_note}
                onChange={handleChange}
                placeholder="Any special instructions..."
                className="border-b border-text bg-transparent py-3 text-[14px]
                  outline-none focus:border-black transition-colors resize-none" />
            </div>

            {/* Guest note */}
            {!isAuthenticated && (
              <p className="text-[13px] text-text-muted p-4 bg-section-bg
                border-l-4 border-accent flex gap-2 mb-5">
                <span>ℹ</span>
                <span>Shopping as guest.
                  <a href="/login" className="font-semibold underline ml-1">Sign in</a> or
                  <a href="/register" className="font-semibold underline ml-1">create an account</a> to track orders.
                </span>
              </p>
            )}

            {/* Delivery option */}
            <div className="mb-6 mt-2">
              <label className="text-[11px] font-bold tracking-wide uppercase text-text-sub block mb-3">
                Delivery Option
              </label>
              {DELIVERY.map(d => (
                <label key={d.value}
                  className="flex items-start gap-3 mb-4 cursor-pointer group">
                  <input type="radio" name="delivery_option" value={d.value}
                    checked={delivery === d.value}
                    onChange={() => setDelivery(d.value)}
                    className="mt-1 accent-black" />
                  <span>
                    <strong className="text-[13px] block">{d.label}</strong>
                    {d.sub && (
                      <small className="text-[12px] text-text-muted">{d.sub}</small>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {/* Live totals */}
            <motion.div layout
              className="p-4 bg-section-bg mb-6 text-[13px] flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <motion.span key={shippingFee} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {shippingFee === 0 ? 'Free' : fmt(shippingFee)}
                </motion.span>
              </div>
              <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-border">
                <span>Total</span>
                <motion.span key={grandTotal} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {fmt(grandTotal)}
                </motion.span>
              </div>
            </motion.div>

            {/* Payment method */}
            <div className="mb-6">
              <label className="text-[11px] font-bold tracking-wide uppercase text-text-sub block mb-3">
                Payment Method
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'flutterwave', label: '⚡ Flutterwave' },
                ].map(p => (
                  <label key={p.value}
                    className={`flex items-center gap-2 px-5 py-3 border-2 cursor-pointer
                      transition-all duration-200 text-[13px] font-semibold
                      ${form.payment_method === p.value
                        ? 'border-black bg-black text-white'
                        : 'border-border hover:border-black'}`}>
                    <input type="radio" name="payment_method" value={p.value}
                      checked={form.payment_method === p.value}
                      onChange={handleChange}
                      className="hidden" />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-danger text-[13px] mb-4 p-3 bg-red-50 border-l-4 border-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="dark" full loading={loading}>
              PROCEED TO PAYMENT →
            </Button>
          </form>

          {/* Order Summary */}
          <div className="bg-section-bg p-5 lg:p-7 order-first lg:order-none lg:sticky lg:top-[90px]">
            <h2 className="text-[11px] font-bold tracking-[0.15em] uppercase
              text-text-sub pb-3 mb-4 border-b border-border">
              YOUR ORDER
            </h2>
            <div className="flex flex-col gap-0 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex items-start gap-3 py-3
                  border-b border-border">
                  <div className="relative w-14 h-14 bg-card-bg flex-shrink-0">
                    {item.product.images && (
                      <Image src={item.product.images}
                        alt={item.product.product_name}
                        fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold uppercase tracking-wide truncate">
                      {item.product.product_name}
                    </p>
                    {item.variations.map(v => (
                      <p key={v.id} className="text-[11px] text-text-muted capitalize">
                        {v.variation_category}: {v.variation_value}
                      </p>
                    ))}
                    <p className="text-[11px] text-text-muted">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-[13px] font-semibold whitespace-nowrap">
                    {fmt(Number(item.sub_total))}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[12px] text-text-sub py-2">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[12px] text-text-sub py-2">
              <span>Shipping</span>
              <span>{shippingFee === 0 ? 'Free' : fmt(shippingFee)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-text font-bold uppercase">
              <span className="text-[13px] tracking-wide">TOTAL</span>
              <motion.span key={grandTotal} initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="text-[22px]">{fmt(grandTotal)}</motion.span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
