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
    queryFn:  () => api.get('/products/', {
      params: { category: activeCategory || undefined, search: search || undefined }
    }).then(r => unwrap<Product>(r.data)),
  })

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10
      grid grid-cols-1 md:grid-cols-[220px_1fr] gap-12 items-start">

      {/* Sidebar */}
      <aside className="md:sticky md:top-[90px]">
        <div className="mb-8">
          <h3 className="text-[11px] font-bold tracking-[0.15em] text-text-sub uppercase mb-4">
            CATEGORIES
          </h3>
          <ul className="flex flex-col gap-2">
            <li>
              <button onClick={() => setActiveCategory('')}
                className={`text-[13px] pl-3 border-l-2 transition-all duration-200
                  ${!activeCategory
                    ? 'text-text border-text font-semibold'
                    : 'text-text-muted border-transparent hover:text-text hover:border-text'}`}>
                All Categories ({products.length})
              </button>
            </li>
            {categories.map(c => (
              <li key={c.id}>
                <button onClick={() => setActiveCategory(c.slug)}
                  className={`text-[13px] pl-3 border-l-2 transition-all duration-200
                    ${activeCategory === c.slug
                      ? 'text-text border-text font-semibold'
                      : 'text-text-muted border-transparent hover:text-text hover:border-text'}`}>
                  {c.category_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main */}
      <div>
        <div className="mb-7 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[13px] text-text-muted tracking-wide">
            {search
              ? `Results for "${search}" — ${products.length} found`
              : `All Products (${products.length})`}
          </p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="text-[13px] border-b border-text bg-transparent
              outline-none pb-1 placeholder:text-text-muted w-[200px]"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-card-bg aspect-square animate-pulse rounded-[2px]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-14 text-text-muted">
            <p className="text-4xl mb-4">📦</p>
            <p className="font-semibold text-text mb-2">No products found.</p>
            <button onClick={() => { setActiveCategory(''); setSearch('') }}
              className="mt-4 bg-black text-white px-7 py-3 text-[12px]
                font-bold tracking-[0.15em] uppercase">
              VIEW ALL
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  )
}
