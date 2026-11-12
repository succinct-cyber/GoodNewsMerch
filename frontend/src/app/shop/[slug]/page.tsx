'use client'
import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Thumbs } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/thumbs'
import api from '@/lib/api'
import { Product, Variation } from '@/types'
import StarRating from '@/components/ui/StarRating'
import Button from '@/components/ui/Button'
import { useCart } from '@/store/cart'
import { useAuth } from '@/store/auth'
import { ShoppingBag, Zap, ChevronRight } from 'lucide-react'

export default function ProductDetailPage() {
  const { slug }                    = useParams<{ slug: string }>()
  const router                      = useRouter()
  const { addItem }                 = useCart()
  const { isAuthenticated }         = useAuth()
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null)
  const [selectedVariations, setSelectedVariations] = useState<Record<string, Variation>>({})
  const [adding, setAdding]         = useState(false)
  const [added,  setAdded]          = useState(false)
  const [error,  setError]          = useState('')

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', slug],
    queryFn:  () => api.get(`/products/${slug}/`).then(r => r.data),
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', product?.id],
    queryFn:  () => api.get(`/products/${product!.id}/reviews/`).then(r => r.data),
    enabled:  !!product?.id,
  })

  if (isLoading || !product) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="aspect-square bg-card-bg animate-pulse rounded-[2px]" />
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-6 bg-card-bg animate-pulse rounded" />)}
        </div>
      </div>
    )
  }

  // Group variations by category
  const byCategory = (product.variations ?? []).reduce<Record<string, Variation[]>>((acc, v) => {
    acc[v.variation_category] = [...(acc[v.variation_category] ?? []), v]
    return acc
  }, {})

  // Build full image list: main + gallery
  const allImages = [
    product.images,
    ...(product.gallery ?? []).map(g => g.image),
  ].filter(Boolean) as string[]

  // Price with quality modifier
  const qualityMod = selectedVariations['quality']
    ? Number(selectedVariations['quality'].price_modifier)
    : 0
  const displayPrice = Number(product.price) + qualityMod

  const handleSelect = (category: string, variation: Variation) => {
    setSelectedVariations(prev => ({ ...prev, [category]: variation }))
    setError('')
  }

  const handleAddToCart = async (goCheckout = false) => {
    const required = Object.keys(byCategory)
    const missing  = required.filter(cat => !selectedVariations[cat])
    if (missing.length) {
      setError(`Please select: ${missing.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`)
      return
    }
    setAdding(true)
    try {
      await addItem(product.id, 1, Object.values(selectedVariations).map(v => v.id))
      if (goCheckout) { router.push('/checkout'); return }   // BUY NOW
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch (e) {
      setError('Failed to add to cart.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-border py-4">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex items-center gap-2
          text-[12px] text-text-muted flex-wrap">
          <Link href="/" className="hover:text-text transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link href="/shop" className="hover:text-text transition-colors">Shop</Link>
          <ChevronRight size={12} />
          <Link href={`/shop?category=${product.category.slug}`}
            className="hover:text-text transition-colors">
            {product.category.category_name}
          </Link>
          <ChevronRight size={12} />
          <span className="text-text">{product.product_name}</span>
        </div>
      </div>

      <section className="py-5 md:py-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-start">

          {/* ── Gallery with Swiper ── */}
          <div className="flex flex-col gap-3">
            {/* Main swiper */}
            <Swiper
              modules={[Navigation, Pagination, Thumbs]}
              thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
              navigation pagination={{ clickable: true }}
              loop={allImages.length > 1}
              className="w-full aspect-square bg-card-bg rounded-[2px] overflow-hidden">
              {allImages.map((src, i) => (
                <SwiperSlide key={i}>
                  <div className="relative w-full h-full aspect-square">
                    <Image src={src} alt={`${product.product_name} ${i + 1}`}
                      fill className="object-cover" priority={i === 0} />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Thumbnail swiper — swipe-type */}
            {allImages.length > 1 && (
              <Swiper
                onSwiper={setThumbsSwiper}
                modules={[Thumbs]}
                spaceBetween={8}
                slidesPerView={4}
                watchSlidesProgress
                className="w-full">
                {allImages.map((src, i) => (
                  <SwiperSlide key={i}
                    className="cursor-pointer border-2 border-transparent
                      [&.swiper-slide-thumb-active]:border-black transition-all">
                    <div className="aspect-square relative bg-card-bg">
                      <Image src={src} alt={`thumb ${i}`} fill className="object-cover" />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase
              text-text-muted mb-2">
              {product.category.category_name}
            </p>
            <h1 className="text-[28px] md:text-[36px] font-bold tracking-wide text-text mb-3">
              {product.product_name}
            </h1>
            <StarRating rating={product.avg_review} count={product.count_review} />

            <motion.p
              key={displayPrice}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[28px] font-bold text-text mt-4 mb-2">
              ₦{displayPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </motion.p>

            {product.description && (
              <p className="text-[14px] text-text-body leading-relaxed mb-6">
                {product.description}
              </p>
            )}

            {/* Variations */}
            {Object.entries(byCategory).map(([category, options]) => (
              <div key={category} className="mb-5">
                <span className="block text-[11px] font-bold tracking-[0.1em]
                  uppercase text-text-sub mb-3">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </span>
                <div className="flex flex-wrap gap-2">
                  {options.map(v => (
                    <motion.button key={v.id} whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelect(category, v)}
                      className={`px-4 py-2 text-[12px] font-medium border transition-all duration-200
                        ${selectedVariations[category]?.id === v.id
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-text border-border hover:border-text'}`}>
                      {v.variation_value.charAt(0).toUpperCase() + v.variation_value.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-danger text-[13px] mb-4 flex items-center gap-2">
                  ⚠ {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Buttons */}
            {product.stock > 0 ? (
              <div className={`grid gap-3 mt-6 ${isAuthenticated ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {isAuthenticated ? (
                  <Button variant="dark" full onClick={() => handleAddToCart()} loading={adding}>
                    <ShoppingBag size={15} />
                    {added ? '✓ ADDED TO CART' : 'ADD TO CART'}
                  </Button>
                ) : (
                  <>
                    <Link href={`/login?next=/shop/${product.slug}`}
                      className="inline-flex items-center justify-center gap-2 bg-transparent
                        text-text border-2 border-text px-7 py-3 text-[12px] font-bold
                        tracking-[0.15em] uppercase hover:bg-text hover:text-white
                        transition-colors duration-200">
                      <ShoppingBag size={15} /> ADD TO CART
                    </Link>
                    <Button variant="dark" onClick={() => handleAddToCart(true)} loading={adding}>
                      <Zap size={15} /> BUY NOW
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-6">
                {['ADD TO CART', 'BUY NOW'].map(label => (
                  <button key={label} disabled
                    className="inline-flex items-center justify-center gap-2 px-7 py-3
                      text-[12px] font-bold tracking-[0.15em] uppercase border-2 border-border
                      text-text-muted cursor-not-allowed opacity-40">
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Guest note */}
            {!isAuthenticated && product.stock > 0 && (
              <p className="text-[13px] text-text-muted mt-4 p-4 bg-section-bg border-l-4 border-accent flex gap-2">
                <span>ℹ</span>
                <span>
                  <strong>Buy Now</strong> checks out as guest.
                  To save items, <Link href="/login" className="font-semibold underline">sign in</Link>.
                </span>
              </p>
            )}

            {/* Stock */}
            <p className={`text-[13px] mt-4 flex items-center gap-2
              ${product.stock > 0 ? 'text-success' : 'text-danger'}`}>
              {product.stock > 0
                ? `✓ In stock (${product.stock} available)`
                : '✗ Out of stock'}
            </p>
          </div>
        </div>

        {/* ── Reviews ── */}
        <div className="max-w-[860px] mx-auto px-4 sm:px-8 mt-20">
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black">
            <h3 className="text-[14px] font-bold tracking-[0.15em] uppercase">
              CUSTOMER REVIEWS
            </h3>
            <StarRating rating={product.avg_review} count={product.count_review} />
          </div>
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-3xl mb-3">💬</p>
              <p>No reviews yet. Be the first.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((r: any) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="bg-white border border-border p-5">
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-black text-white flex items-center
                        justify-center text-[15px] font-bold flex-shrink-0">
                        {r.user.first_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold">{r.user.first_name} {r.user.last_name}</p>
                        <p className="text-[11px] text-text-muted">
                          {new Date(r.updated_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.subject && <p className="font-bold text-[14px] mb-1">{r.subject}</p>}
                  <p className="text-[14px] text-text-body leading-relaxed">{r.review}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
