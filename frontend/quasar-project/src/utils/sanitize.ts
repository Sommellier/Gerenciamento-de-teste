/**
 * Utilitário para sanitização XSS no frontend
 * Usa DOMPurify para limpar HTML malicioso
 */

// Importação dinâmica de DOMPurify para evitar problemas em SSR
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DOMPurify: any = null

async function getDOMPurify() {
  if (!DOMPurify) {
    try {
      const dompurify = await import('dompurify')
      DOMPurify = dompurify.default
    } catch (error) {
      console.warn('DOMPurify não disponível, usando sanitização básica', error)
      // Fallback básico
      DOMPurify = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
        sanitize: (html: string, _options?: any) => {
          if (typeof html !== 'string') return ''
          return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
        }
      }
    }
  }
  return DOMPurify
}

/**
 * Sanitiza HTML permitindo apenas formatação básica
 * Remove scripts, iframes, eventos inline, etc.
 */
export async function sanitizeHTML(html: string): Promise<string> {
  if (!html || typeof html !== 'string') return ''
  
  const purify = await getDOMPurify()
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })
}

/**
 * Sanitiza HTML removendo TODO HTML (apenas texto puro)
 */
export async function sanitizeTextOnly(html: string): Promise<string> {
  if (!html || typeof html !== 'string') return ''
  
  const purify = await getDOMPurify()
  return purify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })
}

/**
 * Versão síncrona para uso em computed properties
 * Nota: Requer que DOMPurify já esteja carregado
 */
export function sanitizeHTMLSync(html: string): string {
  if (!html || typeof html !== 'string') return ''
  
  // Se DOMPurify já estiver carregado, usar diretamente
  if (DOMPurify) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
  }
  
  // Fallback básico se DOMPurify não estiver disponível
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

