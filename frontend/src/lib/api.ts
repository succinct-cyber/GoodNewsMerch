import axios from 'axios'
import { v4 as uuid } from 'uuid'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://goodnewsmerch.onrender.com/api'

const api = axios.create({ baseURL: API_BASE })

/** Guest cart id. Created once, kept in localStorage, sent as X-Cart-ID on every request. */
export function getCartId(): string {
  let id = localStorage.getItem('cart_id')
  if (!id) {
    id = uuid()
    localStorage.setItem('cart_id', id)
  }
  return id
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    config.headers['X-Cart-ID'] = getCartId()
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api

/** DRF returns {count,next,results:[]} when pagination is on and a bare array when it is off. */
export function unwrap<T>(data: any): T[] {
  return Array.isArray(data) ? data : data?.results ?? []
}
