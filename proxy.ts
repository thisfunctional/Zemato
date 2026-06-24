import { NextRequest, NextResponse } from 'next/server'

const publicPaths = ['/login', '/auth/callback']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  const hasSession = !!request.cookies.get('sb-session')
  const isOnboarded = !!request.cookies.get('sb-onboarded')

  // Não autenticado numa rota protegida → login
  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Autenticado mas sem onboarding concluído, fora de /onboarding → onboarding
  // (excluímos rotas públicas para não redirecionar /auth/callback)
  if (!isPublic && hasSession && !isOnboarded && !pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Já fez onboarding e tenta aceder a /onboarding → home
  if (pathname.startsWith('/onboarding') && hasSession && isOnboarded) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Autenticado a tentar ir para /login → home
  if (pathname.startsWith('/login') && hasSession) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
