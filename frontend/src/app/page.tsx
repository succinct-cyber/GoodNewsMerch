
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/types'
import ProductCard from '@/components/ui/ProductCard'

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://goodnewsmerch.onrender.com/api'

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API}/products/`, {
      next: { revalidate: 60 },
    })

    if (!res.ok) return []

    const data = await res.json()
    const list: Product[] = Array.isArray(data)
      ? data
      : data.results ?? []

    return list.slice(0, 3)
  } catch {
    return []
  }
}

export default async function HomePage() {
  const products = await getFeaturedProducts()

  return (
    <>      
      {/* HERO */}
      <section className="bg-page-bg">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 md:px-8
          py-6 md:py-12 grid grid-cols-[1.15fr_0.85fr]
          md:grid-cols-2 gap-2 sm:gap-5 md:gap-12 items-center">

          {/* Text: always on the left */}
          <div className="min-w-0 order-1">
            <h1 className="font-bold leading-[1.05] tracking-wide text-text">
              <span className="block text-[clamp(16px,3.2vw,42px)]">
                WEAR THE
              </span>

              <span className="block text-[clamp(24px,6vw,64px)]
                font-extrabold tracking-normal text-black mt-1">
                MESSAGE
              </span>
            </h1>

            <h2 className="text-[clamp(12px,2.2vw,24px)]
              font-bold tracking-wide mt-2 md:mt-3">
              SHARE THE NEWS.
            </h2>

            <p className="text-[clamp(9px,1.3vw,13px)]
              text-text-body mt-2 md:mt-3 mb-3 md:mb-5">
              Wear your faith comfortably and in style.
            </p>

            <Link
              href="/shop"
              className="flex items-center justify-center
                bg-black text-white border-2 border-black
                px-2 sm:px-5 md:px-7 py-2 sm:py-3
                text-[9px] sm:text-[10px] md:text-[11px]
                font-bold tracking-[0.1em] md:tracking-[0.15em]
                uppercase hover:bg-[#2a2a2a] transition-colors"
            >
              SHOP THE DROP
            </Link>
          </div>

          {/* Hero image: always on the right */}
          <div className="min-w-0 order-2">
            <Image
              src="/images/items/hero.png"
              alt="GoodNews Merch collection"
              width={560}
              height={560}
              priority
              sizes="(max-width: 767px) 45vw, 50vw"
              className="block w-full h-auto max-h-[240px]
                sm:max-h-[320px] md:max-h-[480px]
                object-contain object-center"
            />
          </div>

        </div>
      </section>


      
    {/* FUNDRAISING */}
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 py-5 md:py-8">
      <div className="relative w-full overflow-hidden border border-border">
        <Image
          src="/images/banners/FUND_RAISING_BANNER.png"
          alt="GoodNews Merch fundraising initiative"
          width={922}
          height={346}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="block w-full h-auto"
        />

        <Link
          href="/fundraising"
          className="absolute top-[22.5%] right-[9.5%]
            inline-flex items-center justify-center
            bg-black text-white
            px-3 py-2 sm:px-5 sm:py-2.5 md:px-7 md:py-3
            text-[8px] sm:text-[10px] md:text-[11px]
            font-bold tracking-[0.12em] uppercase
            hover:bg-[#2a2a2a] transition-colors"
        >
          PROCEED
        </Link>
      </div>
    </section>



      {/* POPULAR PRODUCTS */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-8
        py-6 md:py-10">

        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="text-[15px] md:text-[19px]
            font-bold tracking-[0.16em] uppercase text-text">
            Popular Products
          </h2>

          <Link
            href="/shop"
            className="shrink-0 border-2 border-text text-text
              px-4 py-2 text-[10px] font-bold tracking-[0.15em]
              uppercase hover:bg-text hover:text-white transition-colors"
          >
            See all
          </Link>
        </div>

        {products.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-text-muted py-10 text-sm">
            We couldn't load products just now. Please refresh in a moment.
          </p>
        )}
      </section>

      {/* CLOSING BANNER */}
      <section className="bg-black py-9 md:py-14 px-4 md:px-8
        text-center text-white">
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-[17px] md:text-[25px]
            font-bold tracking-[0.12em] uppercase mb-3">
            Every purchase supports a cause.
          </h2>

          <p className="text-white/70 mb-6 text-[12px] md:text-[14px]">
            GoodNews Merch donates a portion of its revenue to
            CAC Goodnews Assembly after sales are completed.
          </p>

          <Link
            href="/fundraising"
            className="inline-flex items-center justify-center
              bg-white text-black border-2 border-white
              px-7 py-3 text-[11px] font-bold tracking-[0.15em]
              uppercase hover:bg-gray-200 transition-colors"
          >
            Learn more
          </Link>
        </div>
      </section>
    </>
  )
}