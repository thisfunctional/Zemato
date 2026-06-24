import { createClient } from '@supabase/supabase-js'

// ─── Cookie storage adapter ────────────────────────────────────────────────────
//
// O localStorage é isolado em iOS PWA (modo standalone usa um WebView separado)
// e pode ser limpo pelo sistema. Cookies persistem entre contextos e sobrevivem
// a limpezas de memória.
//
// O JWT da Supabase pode exceder 4 KB (limite por cookie), por isso o adapter
// divide valores grandes em chunks numerados (key.0, key.1, …).

const CHUNK_SIZE = 3500 // bytes — margem segura abaixo dos 4 096 B por cookie

const isClient = typeof document !== 'undefined'

function allCookies(): Record<string, string> {
  if (!isClient) return {}
  return Object.fromEntries(
    document.cookie
      .split('; ')
      .filter(Boolean)
      .map((pair) => {
        const idx = pair.indexOf('=')
        return [pair.slice(0, idx), pair.slice(idx + 1)]
      }),
  )
}

function writeCookie(name: string, value: string, maxAge = 31_536_000 /* 1 ano */) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
}

function eraseCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

const cookieStorage = {
  getItem(key: string): string | null {
    if (!isClient) return null
    const jar = allCookies()

    // Tentativa directa (cookie único)
    if (key in jar) return decodeURIComponent(jar[key])

    // Tentativa com chunks
    const parts: string[] = []
    for (let i = 0; `${key}.${i}` in jar; i++) {
      parts.push(decodeURIComponent(jar[`${key}.${i}`]))
    }
    return parts.length > 0 ? parts.join('') : null
  },

  setItem(key: string, value: string): void {
    if (!isClient) return
    const encoded = encodeURIComponent(value)

    if (encoded.length <= CHUNK_SIZE) {
      // Limpa chunks antigos de uma sessão anterior maior
      const jar = allCookies()
      for (let i = 0; `${key}.${i}` in jar; i++) eraseCookie(`${key}.${i}`)
      writeCookie(key, encoded)
    } else {
      // Divide em chunks e remove o cookie directo se existir
      eraseCookie(key)
      let chunkIndex = 0
      for (let offset = 0; offset < encoded.length; offset += CHUNK_SIZE) {
        writeCookie(`${key}.${chunkIndex}`, encoded.slice(offset, offset + CHUNK_SIZE))
        chunkIndex++
      }
      // Remove chunks excedentes de uma escrita anterior
      const jar = allCookies()
      for (let i = chunkIndex; `${key}.${i}` in jar; i++) eraseCookie(`${key}.${i}`)
    }
  },

  removeItem(key: string): void {
    if (!isClient) return
    eraseCookie(key)
    const jar = allCookies()
    for (let i = 0; `${key}.${i}` in jar; i++) eraseCookie(`${key}.${i}`)
  },
}

// ─── Supabase client ───────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
