'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api, { unwrap } from '@/lib/api'
import ProductCard from '@/components/ui/ProductCard'
import { Category, Product } from '@/types'

function ShopContent() {
  const params = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(params.get('category') ?? '')
  const [search, setSearch]                 = useState(params.get('search') ?? '')

  // keep state in sync when the navbar search / breadcrumb changes the URL
  useEffect(() => {
    setSearch(params.get('search') ?? '')
    setActiveCategory(params.get('category') ?? '')
  }, [params])

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories/').then(r => unwrap<Category>(r.data)),
  })

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', activeCategory, search],
    queryFn: () => api.get('/products/', {
      params: { category: activeCategory || undefined, search: search || undefined },
    }).then(r => unwrap<Product>(r.data)),
  })

  const chip = (active: boolean) =>
    `shrink-0 px-4 py-2 text-[12px] font-semibold tracking-wide border transition-colors ${
      active ? 'bg-black text-white border-black' : 'bg-white text-text-sub border-border'}`

  const sideBtn = (active: boolean) =>
    `text-[13px] pl-3 border-l-2 text-left transition-all duration-200 ${
      active ? 'text-text border-text font-semibold'
             : 'text-text-muted border-transparent hover:text-text hover:border-text'}`

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-5 md:py-10
      grid grid-cols-1 md:grid-cols-[190px_1fr] lg:grid-cols-[220px_1fr] gap-4 md:gap-10 items-start">

      {/* Desktop / tablet: category sidebar */}
      <aside className="hidden md:block md:sticky md:top-[94px]">
        <h3 className="text-[11px] font-bold tracking-[0.15em] text-text-sub uppercase mb-4">Categories</h3>
        <ul className="flex flex-col gap-2">
          <li><button onClick={() => setActiveCategory('')} className={sideBtn(!activeCategory)}>All Categories</button></li>
          {categories.map(c => (
            <li key={c.id}>
              <button onClick={() => setActiveCategory(c.slug)} className={sideBtn(activeCategory === c.slug)}>
                {c.category_name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0">
        {/* Phones: one scrollable row of category chips instead of a tall list */}
        <div className="md:hidden -mx-4 px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setActiveCategory('')} className={chip(!activeCategory)}>All</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCategory(c.slug)} className={chip(activeCategory === c.slug)}>
              {c.category_name}
            </button>
          ))}
        </div>

        <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
            className="order-1 md:order-2 w-full md:w-[240px] border border-border bg-white px-3 py-2.5
              text-[14px] outline-none focus:border-black transition-colors placeholder:text-text-muted" />
          <p className="order-2 md:order-1 text-[13px] text-text-muted tracking-wide">
            {search ? `Results for "${search}" — ${products.length} found` : `All Products (${products.length})`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-card-bg aspect-[4/5] animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-14 text-text-muted">
            <p className="font-semibold text-text mb-2">No products found.</p>
            <button onClick={() => { setActiveCategory(''); setSearch('') }}
              className="mt-4 bg-black text-white px-7 py-3 text-[12px] font-bold tracking-[0.15em] uppercase">
              View all
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ShopPage() {
  return <Suspense fallback={null}><ShopContent /></Suspense>
}
