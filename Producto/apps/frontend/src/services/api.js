import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 10000,
})

// Adjunta el token JWT en cada request automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expiró, redirige al login
// EXCEPTO si el error viene del endpoint de login (deja que el catch lo maneje)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const esLoginEndpoint = err.config?.url?.includes('/api/auth/login')
    if (err.response?.status === 401 && !esLoginEndpoint) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api