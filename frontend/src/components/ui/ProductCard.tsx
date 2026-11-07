'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Product } from '@/types'
import StarRating from './StarRating'

export default function ProductCard({ product }: { product: Product }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
      className="bg-white border border-border overflow-hidden
        transition-shadow duration-200 hover:shadow-md group">

      {/* Image */}
      <Link href={`/shop/${product.slug}`} className="block aspect-square bg-card-bg overflow-hidden">
        {product.images ? (
          <Image
            src={product.images}
            alt={product.product_name}
            width={400} height={400}
            sizes="(min-width: 1024px) 33vw, 50vw"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <span className="text-4xl">📦</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <Link href={`/shop/${product.slug}`}
          className="block text-[11px] sm:text-[13px] font-bold tracking-wide uppercase leading-snug
            line-clamp-2 text-text mb-1 hover:opacity-70 transition-opacity">
          {product.product_name}
        </Link>
        <StarRating rating={product.avg_review} count={product.count_review} />
        <p className="text-[13px] sm:text-[15px] font-semibold text-text mt-1.5 sm:mt-2">
          ₦{Number(product.price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </motion.div>
  )
}
