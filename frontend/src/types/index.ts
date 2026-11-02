export interface Category {
  id: number
  category_name: string
  slug: string
  description: string
  cat_image: string
}

export interface Variation {
  id: number
  variation_category: 'color' | 'size' | 'quality'
  variation_value: string
  price_modifier: number
}

export interface Product {
  id: number
  product_name: string
  slug: string
  description: string
  price: number
  images: string
  stock: number
  is_available: boolean
  category: Category
  variations?: Variation[]
  gallery?: { id: number; image: string }[]
  avg_review: number
  count_review: number
}

export interface CartItem {
  id: number
  product: Product
  variations: Variation[]
  quantity: number
  sub_total: number
}

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  phone_number: string
  username: string
}

export interface Order {
  id: number
  order_number: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  country: string
  order_note: string
  order_total: number
  shipping_fee: number
  tax: number
  status: string
  delivery_option: string
  is_ordered: boolean
  created_at: string
  products: {
    id: number
    product: Product
    variations: Variation[]
    quantity: number
    product_price: number
  }[]
}

export interface Profile {
  id: number
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  country: string
  profile_picture: string | null
}

export interface DashboardData {
  order_count: number
  completed_count: number
  pending_count: number
  recent: Order[]
}
