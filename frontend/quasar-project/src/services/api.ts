import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000 // 10 segundos de timeout
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

// Interceptor de resposta para tratar erros de conexão
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se não há resposta, é erro de rede/conexão
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Tempo de espera esgotado. O servidor demorou muito para responder.'
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Erro de conexão. Verifique se o servidor está rodando e sua internet.'
      } else {
        error.message = 'Erro de conexão. Verifique se o servidor está rodando em http://localhost:3000'
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
