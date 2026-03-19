import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET ?? ''
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Só protege rotas /admin (exceto /admin/login e APIs do admin)
  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname.startsWith('/admin/login')) return NextResponse.next()
  if (pathname.startsWith('/api/admin')) return NextResponse.next()

  const token = request.cookies.get('admin_session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  try {
    await jwtVerify(token, getJwtSecret())
    return NextResponse.next()
  } catch {
    // Token inválido ou expirado
    const response = NextResponse.redirect(new URL('/admin/login', request.url))
    response.cookies.set('admin_session', '', { maxAge: 0, path: '/' })
    return response
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
