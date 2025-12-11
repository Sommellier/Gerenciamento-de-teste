import axios from 'axios'
import { isValidRedirect } from '../utils/helpers'

// Obter URL base da API. Se não houver VITE_API_URL, usar localhost:3000 como
// fallback explícito para manter compatibilidade com os testes e ambiente local.
export const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return apiUrl.replace(/\/$/, '')
}

const baseApiUrl = getApiUrl()
const api = axios.create({
  baseURL: baseApiUrl ? `${baseApiUrl}/api` : '/api',
  timeout: 10000 // 10 segundos de timeout
})

interface RefreshTokenResponse {
  accessToken: string
}

interface CsrfTokenResponse {
  csrfToken: string
}

// Função para obter CSRF token do backend
async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await axios.get<CsrfTokenResponse>(`${getApiUrl()}/api/csrf-token`)
    return response.data.csrfToken
  } catch {
    return null
  }
}

// Função para obter ou usar CSRF token armazenado
async function getOrFetchCsrfToken(): Promise<string | null> {
  // Tentar obter do sessionStorage primeiro
  let csrfToken = sessionStorage.getItem('csrfToken')
  
  // Se não existir ou estiver expirado, buscar novo
  if (!csrfToken) {
    csrfToken = await getCsrfToken()
    if (csrfToken) {
      sessionStorage.setItem('csrfToken', csrfToken)
    }
  }
  
  return csrfToken
}

api.interceptors.request.use(
  (config) => {
    // Garantir que headers existe
    if (!config.headers) {
      config.headers = {}
    }
    
    // Usar sessionStorage ao invés de localStorage para maior segurança
    const token = sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Adicionar CSRF token em requisições que modificam estado
    const isStateChangingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')
    if (isStateChangingMethod) {
      // Tentar obter CSRF token do sessionStorage primeiro (síncrono)
      const csrfToken = sessionStorage.getItem('csrfToken')
      
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken
      } else {
        // Se não existir, buscar de forma assíncrona em background
        // O token será usado na próxima requisição
        getOrFetchCsrfToken().then(token => {
          if (token) {
            sessionStorage.setItem('csrfToken', token)
          }
        }).catch(() => {
          // Ignorar erros silenciosamente
        })
      }
    }
    
    // Definir Content-Type apenas se não for FormData
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
)

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
      const refreshToken = sessionStorage.getItem('refreshToken')
      
      if (refreshToken) {
        try {
          // Tentar obter novo access token
          const response = await axios.post<RefreshTokenResponse>(`${getApiUrl()}/api/refresh-token`, {
            refreshToken
          })
          
          // Salvar novo access token em sessionStorage
          sessionStorage.setItem('token', response.data.accessToken)
          
          // Retentar requisição original com novo token
          const originalRequest = error.config
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`
          }
          return axios(originalRequest)
        } catch {
          // Refresh falhou, limpar tokens e redirecionar para login
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('refreshToken')
          sessionStorage.removeItem('user')
          sessionStorage.removeItem('csrfToken')
          
          // Redirecionar para login (validar pathname para prevenir Open Redirect)
          if (window.location.pathname !== '/login') {
            const redirectPath = isValidRedirect(window.location.pathname) 
              ? window.location.pathname 
              : '/dashboard'
            window.location.href = '/login?redirect=' + encodeURIComponent(redirectPath)
          }
        }
      } else {
        // Não há refresh token, limpar tudo e redirecionar
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('refreshToken')
        sessionStorage.removeItem('user')
        sessionStorage.removeItem('csrfToken')
        
        if (window.location.pathname !== '/login') {
          // Validar pathname para prevenir Open Redirect
          const redirectPath = isValidRedirect(window.location.pathname) 
            ? window.location.pathname 
            : '/dashboard'
          window.location.href = '/login?redirect=' + encodeURIComponent(redirectPath)
        }
      }
    }
    
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
)

export default api
