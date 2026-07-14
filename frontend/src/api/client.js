import axios from 'axios'

const client = axios.create({ baseURL: '/api' })

// Sisipkan JWT ke setiap request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('jfp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout jika token invalid/expired.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jfp_token')
      localStorage.removeItem('jfp_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// Helper ekstrak pesan error dari FastAPI.
export function apiError(err, fallback = 'Terjadi kesalahan') {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ')
  return fallback
}

export default client
