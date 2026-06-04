import { auth } from "@/server/auth/edge"
import { NextResponse } from "next/server"
import {
  isAdminTotal,
  podeVerProjetos,
  podeVerComercial,
  podeVerPainelProjetos,
  podeVerPainelComercial,
  areaPadrao,
} from "@/lib/acesso"
import type { PerfilAcesso } from "@prisma/client"

const PUBLIC_PATHS = ["/login", "/esqueci-senha", "/redefinir-senha", "/convite"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isLoggedIn = !!req.auth

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoggedIn && req.auth?.user.mustChangePassword &&
    !pathname.startsWith("/trocar-senha") && !pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/trocar-senha", req.url))
  }

  if (isLoggedIn) {
    const raw = req.auth!.user
    const u = { isSystemAdmin: raw.isSystemAdmin, perfil: raw.perfil as PerfilAcesso }

    if (pathname === "/") {
      return NextResponse.redirect(new URL(areaPadrao(u), req.url))
    }

    const qPainelComercial  = pathname === "/painel-comercial" || pathname.startsWith("/painel-comercial/")
    const qPainelGerencial  = pathname === "/painel-projetos" || pathname.startsWith("/painel-projetos/")
    const qPainelProjetos   = (pathname === "/painel" || pathname.startsWith("/painel/")) && !qPainelComercial && !qPainelGerencial
    const qComercial = pathname.startsWith("/comercial")
    const qProjetos  = pathname.startsWith("/projetos")

    if (qProjetos        && !podeVerProjetos(u))        return NextResponse.redirect(new URL(areaPadrao(u), req.url))
    if (qComercial       && !podeVerComercial(u))       return NextResponse.redirect(new URL(areaPadrao(u), req.url))
    if (qPainelProjetos  && !podeVerPainelProjetos(u))  return NextResponse.redirect(new URL(areaPadrao(u), req.url))
    if (qPainelGerencial && !podeVerPainelProjetos(u))  return NextResponse.redirect(new URL(areaPadrao(u), req.url))
    if (qPainelComercial && !podeVerPainelComercial(u)) return NextResponse.redirect(new URL(areaPadrao(u), req.url))
    if (pathname.startsWith("/configuracoes/usuarios") && !isAdminTotal(u)) return NextResponse.redirect(new URL(areaPadrao(u), req.url))
    if (pathname.startsWith("/chat") && !isAdminTotal(u) && u.perfil !== "ADMIN_PROJETO") return NextResponse.redirect(new URL(areaPadrao(u), req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/health).*)"],
}
