import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Definir Content-Type apenas se não for FormData
  if (!(config.data instanceof FormData)) {
    if (!config.headers) {
      config.headers = {}
    }
    config.headers['Content-Type'] = 'application/json'
  }
  
  return config
})

export default api
