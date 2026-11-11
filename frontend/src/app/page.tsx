
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
      <section className="relative w-full overflow-hidden bg-black">
  <div className="relative w-full">
    <img
      src="/images/items/heero.png"
      alt="GoodNews Merch Omo Olorun collection"
      className="block w-full h-auto"
    />

    {/* Dark gradient */}
    <div
      className="absolute inset-0 z-10 pointer-events-none"
      style={{
        background:
          "linear-gradient(90deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.58) 35%, rgba(0,0,0,0.20) 60%, transparent 80%)",
      }}
    />

    {/* Hero content */}
    <div className="absolute inset-0 z-20 flex items-center">
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="w-[50%] text-white">

          <h1 className="uppercase leading-none">
            <span className="block text-[length:clamp(16px,2.2vw,44px)] font-normal">
              Wear the
            </span>
            <span className="block text-[length:clamp(26px,3.6vw,72px)] font-extrabold leading-[1] mt-1">
              Message
            </span>
          </h1>

          <h2 className="uppercase text-[length:clamp(13px,1.6vw,32px)] font-bold mt-[clamp(14px,2.6vw,50px)]">
            Share the news.
          </h2>

          <p className="text-[length:clamp(9px,0.85vw,17px)] font-normal text-white/90 mt-[clamp(6px,1vw,18px)]">
            Wear your faith comfortably and in style.
          </p>

          <Link
            href="/shop"
            className="inline-flex w-fit items-center justify-center bg-black text-white border-2 border-black
              px-4 sm:px-6 md:px-[30px] py-2 sm:py-3 md:py-[16px]
              mt-[clamp(10px,1.6vw,30px)]
              text-[8px] sm:text-[10px] md:text-[11px] font-bold
              tracking-[0.15em] whitespace-nowrap uppercase
              hover:bg-white hover:text-black transition-colors"
          >
            Shop the drop
          </Link>

        </div>
      </div>
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