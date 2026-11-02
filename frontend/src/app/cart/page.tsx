'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '@/store/cart'
import Button from '@/components/ui/Button'

export default function CartPage() {
  const { items, fetchCart, updateItem, removeItem, total, loading } = useCart()

  useEffect(() => { fetchCart() }, [])

  if (loading) return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16">
      {[1,2].map(i => (
        <div key={i} className="h-24 bg-card-bg animate-pulse rounded mb-4" />
      ))}
    </div>
  )

  if (items.length === 0) return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 text-center text-text-muted">
      <ShoppingBag size={48} className="mx-auto mb-5 opacity-30" />
      <h2 className="text-[20px] font-bold tracking-[0.15em] uppercase text-text mb-2">
        YOUR CART IS EMPTY
      </h2>
      <p className="mb-6">Looks like you haven't added anything yet.</p>
      <Link href="/shop">
        <Button variant="dark">SHOP NOW</Button>
      </Link>
    </div>
  )

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

  return (
    <section className="py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
        <h1 className="text-[40px] md:text-[64px] font-bold tracking-[0.1em] uppercase text-text mb-2">
          CART
        </h1>
        <div className="w-[60px] h-[3px] bg-text mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">
          {/* Items */}
          <div>
            {/* Table head */}
            <div className="hidden md:grid grid-cols-[1fr_100px_120px_100px]
              gap-4 pb-3 border-b border-text">
              {['PRODUCT','PRICE','QTY','TOTAL'].map(h => (
                <span key={h} className="text-[11px] font-bold tracking-[0.15em]
                  text-text-sub uppercase">{h}</span>
              ))}
            </div>

            <AnimatePresence>
              {items.map(item => {
                const unitPrice = Number(item.sub_total) / item.quantity
                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_100px]
                      gap-4 py-5 border-b border-border items-center">

                    {/* Product info */}
                    <div className="flex gap-4 items-start">
                      <div className="w-20 h-20 bg-card-bg flex-shrink-0 overflow-hidden relative">
                        {item.product.images && (
                          <Image src={item.product.images}
                            alt={item.product.product_name}
                            fill className="object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold tracking-wide uppercase mb-1">
                          {item.product.product_name}
                        </p>
                        {item.variations.map(v => (
                          <p key={v.id} className="text-[12px] text-text-muted">
                            {v.variation_category.charAt(0).toUpperCase() + v.variation_category.slice(1)}: {v.variation_value}
                          </p>
                        ))}
                        <button onClick={() => removeItem(item.id)}
                          className="mt-2 text-[11px] text-text-muted flex items-center gap-1
                            hover:text-danger transition-colors">
                          <Trash2 size={12} /> REMOVE
                        </button>
                      </div>
                    </div>

                    {/* Unit price */}
                    <p className="text-[14px] font-semibold hidden md:block">
                      {fmt(unitPrice)}
                    </p>

                    {/* Qty stepper */}
                    <div className="flex items-center border border-border h-9 w-fit">
                      <button onClick={() => updateItem(item.id, item.quantity - 1)}
                        className="w-9 h-full flex items-center justify-center
                          hover:bg-section-bg transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center text-[14px] font-semibold
                        border-x border-border h-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                      <button onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="w-9 h-full flex items-center justify-center
                          hover:bg-section-bg transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <p className="text-[15px] font-semibold text-right md:text-left">
                      {fmt(Number(item.sub_total))}
                    </p>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            <div className="mt-6">
              <Link href="/shop"
                className="text-[12px] font-semibold tracking-wide text-text-muted
                  hover:text-text transition-colors uppercase">
                ← CONTINUE SHOPPING
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-section-bg p-7 sticky top-[90px]">
            <h2 className="text-[14px] font-bold tracking-[0.15em] uppercase mb-5">
              ORDER SUMMARY
            </h2>
            <div className="flex justify-between text-[13px] text-text-sub py-2
              border-b border-border">
              <span>Subtotal</span>
              <span>{fmt(total())}</span>
            </div>
            <div className="flex justify-between text-[13px] text-text-sub py-2">
              <span>Shipping</span>
              <span className="text-text-muted">Calculated at checkout</span>
            </div>
            <div className="flex justify-between items-center pt-4 mt-2
              border-t border-text font-bold uppercase tracking-wide">
              <span className="text-[13px]">TOTAL</span>
              <span className="text-[22px]">{fmt(total())}</span>
            </div>
            <div className="mt-6">
              <Link href="/checkout">
                <Button variant="dark" full>PROCEED TO CHECKOUT →</Button>
              </Link>
            </div>
            <div className="mt-4 text-[11px] text-text-muted tracking-wide uppercase leading-relaxed">
              <p className="font-bold mb-1">SHIPPING INFO</p>
              <p>Pickup · Lagos delivery (₦4,000) · Outside Lagos (₦6,000)</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
