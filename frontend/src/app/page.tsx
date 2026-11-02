import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/types'
import ProductCard from '@/components/ui/ProductCard'

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://goodnewsmerch.onrender.com/api'}/products/?limit=3`,
      { next: { revalidate: 60 } }
    )
    const data = await res.json()
    return Array.isArray(data) ? data.slice(0, 3) : data.results?.slice(0, 3) ?? []
  } catch { return [] }
}

export default async function HomePage() {
  const products = await getFeaturedProducts()

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-page-bg min-h-[calc(72vh-70px)] flex items-center">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-4 sm:px-8 py-10 md:py-14 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div>
            <h1 className="text-[32px] md:text-[56px] font-bold leading-none tracking-wide text-text mb-2">
              WEAR THE
            </h1>
            <span className="block text-[56px] md:text-[80px] font-extrabold leading-none
              tracking-wide text-black mb-2">
              MESSAGE
            </span>
            <h2 className="text-[24px] md:text-[32px] font-bold tracking-wide mb-3">
              SHARE THE NEWS.
            </h2>
            <p className="text-[14px] text-text-body mb-8">
              Wear your faith comfortably and in style.
            </p>
            <Link href="/shop"
              className="inline-flex items-center gap-2 bg-black text-white px-7 py-3
                text-[12px] font-bold tracking-[0.15em] uppercase border-2 border-black
                hover:bg-[#2a2a2a] transition-colors duration-200">
              SHOP THE DROP
            </Link>
          </div>
          <div className="order-first md:order-none">
            <Image
              src="/images/items/hero.png"
              alt="GoodNews Merch Hero"
              width={560} height={560}
              className="w-full h-auto rounded-[2px] object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* ── Fundraising Banner ── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6">
        <div className="relative aspect-[1920/600] overflow-hidden border border-border rounded-[2px]">
          <Image
            src="/images/banners/FUND_RAISING_BANNER.png"
            alt="Fundraising"
            fill className="object-cover"
          />
          <div className="absolute inset-0 flex items-start justify-end pt-[6%] pr-[6%]">
            <Link href="/fundraising"
              className="bg-black text-white px-8 py-3 text-[13px] font-bold
                tracking-[0.2em] uppercase border-2 border-white
                hover:bg-white hover:text-black transition-colors duration-200">
              PROCEED
            </Link>
          </div>
        </div>
      </section>

      {/* ── Popular Products ── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[22px] font-bold tracking-[0.2em] uppercase text-text">
            POPULAR PRODUCTS
          </h2>
          <Link href="/shop"
            className="inline-flex items-center gap-2 bg-transparent text-text px-7 py-3
              text-[12px] font-bold tracking-[0.15em] uppercase border-2 border-text
              hover:bg-text hover:text-white transition-colors duration-200">
            SEE ALL
          </Link>
        </div>
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-card-bg aspect-square animate-pulse rounded-[2px]" />
            ))}
          </div>
        }>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </Suspense>
      </section>

      {/* ── Dark CTA Banner ── */}
      <section className="bg-black py-14 px-4 sm:px-8 text-center text-white">
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-[20px] md:text-[32px] font-bold tracking-[0.15em] uppercase mb-4">
            EVERY PURCHASE SUPPORTS A CAUSE.
          </h2>
          <p className="text-white/70 mb-8 text-[15px]">
            A portion of every sale goes toward outreach programs and community development.
          </p>
          <Link href="/fundraising"
            className="inline-flex items-center gap-2 bg-white text-black px-7 py-3
              text-[12px] font-bold tracking-[0.15em] uppercase border-2 border-white
              hover:bg-section-bg transition-colors duration-200">
            LEARN MORE
          </Link>
        </div>
      </section>
    </>
  )
}
