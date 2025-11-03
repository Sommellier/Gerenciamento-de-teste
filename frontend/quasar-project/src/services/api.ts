import axios from 'axios'

// Obter URL da API da variável de ambiente ou usar localhost como fallback para desenvolvimento
export const getApiUrl = () => {
  // No Quasar/Vite, variáveis de ambiente são acessadas via import.meta.env
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  // Garantir que a URL não termine com / para evitar problemas
  return apiUrl.replace(/\/$/, '')
}

const api = axios.create({
  baseURL: `${getApiUrl()}/api`,
  timeout: 10000 // 10 segundos de timeout
})

interface RefreshTokenResponse {
  accessToken: string
}

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

// Interceptor de resposta para tratar erros de conexão e autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Se não há resposta, é erro de rede/conexão
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Tempo de espera esgotado. O servidor demorou muito para responder.'
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Erro de conexão. Verifique se o servidor está rodando e sua internet.'
      } else {
        error.message = 'Erro de conexão. Verifique se o servidor está rodando e sua internet.'
      }
    }
    
    // Se é erro 401 (Unauthorized), tentar refresh token
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (refreshToken) {
        try {
          // Tentar obter novo access token
          const response = await axios.post<RefreshTokenResponse>(`${getApiUrl()}/api/refresh-token`, {
            refreshToken
          })
          
          // Salvar novo access token
          localStorage.setItem('token', response.data.accessToken)
          
          // Retentar requisição original com novo token
          const originalRequest = error.config
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`
          return axios(originalRequest)
        } catch {
          // Refresh falhou, limpar tokens e redirecionar para login
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          
          // Redirecionar para login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
          }
        }
      } else {
        // Não há refresh token, limpar tudo e redirecionar
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
        }
      }
    }
    
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
)

export default api
