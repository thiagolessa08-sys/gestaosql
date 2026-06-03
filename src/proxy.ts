import { auth } from "@/server/auth/edge"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = [
  "/login",
  "/esqueci-senha",
  "/redefinir-senha",
  "/convite",
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isLoggedIn = !!req.auth

  // Não logado tentando acessar rota protegida → redireciona para login
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logado com mustChangePassword → força troca de senha
  if (
    isLoggedIn &&
    req.auth?.user.mustChangePassword &&
    !pathname.startsWith("/trocar-senha") &&
    !pathname.startsWith("/api/auth")
  ) {
    return NextResponse.redirect(new URL("/trocar-senha", req.url))
  }

  // Controle de acesso por perfil (admin vê tudo)
  if (isLoggedIn) {
    const user = req.auth!.user
    const isAdmin = user.isSystemAdmin
    const isComercial = user.perfil === "COMERCIAL"
    // Área padrão do usuário
    const areaPadrao = !isAdmin && isComercial ? "/comercial" : "/projetos"

    // Raiz → área do usuário
    if (pathname === "/") {
      return NextResponse.redirect(new URL(areaPadrao, req.url))
    }

    if (!isAdmin) {
      const querComercial = pathname.startsWith("/comercial")
      const querProjetos = pathname.startsWith("/projetos")
      const querPainelComercial = pathname.startsWith("/painel-comercial")
      const querPainelProjetos = pathname.startsWith("/painel") && !querPainelComercial

      // Comercial: acessa /comercial e /painel-comercial; bloqueia projetos e painel de projetos
      if (isComercial && (querProjetos || querPainelProjetos)) {
        return NextResponse.redirect(new URL("/comercial", req.url))
      }
      // Projetos: acessa /projetos; bloqueia comercial, painel comercial e painel de projetos (só admin)
      if (!isComercial && (querComercial || querPainelComercial || querPainelProjetos)) {
        return NextResponse.redirect(new URL("/projetos", req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/health).*)",
  ],
}
