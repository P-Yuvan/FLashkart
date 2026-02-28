import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fc_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (err) => Promise.reject(err)
)

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fc_token')
      localStorage.removeItem('fc_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
