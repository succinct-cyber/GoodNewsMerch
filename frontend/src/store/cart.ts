import { create } from 'zustand'
import api, { getCartId } from '@/lib/api'
import { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  loading: boolean
  fetchCart: () => Promise<void>
  addItem: (productId: number, quantity: number, variationIds: number[]) => Promise<void>
  updateItem: (itemId: number, quantity: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  mergeCart: () => Promise<void>
  total: () => number
  count: () => number
}

export const useCart = create<CartState>()((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/cart/')
      set({ items: Array.isArray(data) ? data : data.results ?? [] })
    } finally {
      set({ loading: false })
    }
  },

  addItem: async (productId, quantity, variationIds) => {
    await api.post('/cart/add/', {
      product_id: productId,
      quantity,
      variations: variationIds,
      cart_id: getCartId(),
    })
    await get().fetchCart()
  },

  updateItem: async (itemId, quantity) => {
    await api.patch('/cart/update/', { item_id: itemId, quantity })
    await get().fetchCart()
  },

  removeItem: async (itemId) => {
    await api.delete(`/cart/remove/${itemId}/`)
    set((s) => ({ items: s.items.filter((i) => i.id !== itemId) }))
  },

  // right after login: guest cart → the account's cart
  mergeCart: async () => {
    await api.post('/cart/merge/', { cart_id: getCartId() })
    await get().fetchCart()
  },

  total: () => get().items.reduce((s, i) => s + Number(i.sub_total), 0),
  count: () => get().items.reduce((s, i) => s + i.quantity, 0),
}))
