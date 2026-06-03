import type { PerfilAcesso } from "@prisma/client"

export interface UserAcesso {
  isSystemAdmin: boolean
  perfil: PerfilAcesso
}

// Admin total (isSystemAdmin) sobrepõe tudo
export const isAdminTotal      = (u: UserAcesso) => u.isSystemAdmin
export const isAdminProjetos   = (u: UserAcesso) => u.isSystemAdmin || u.perfil === "ADMIN_PROJETO"
export const isAdminComercial  = (u: UserAcesso) => u.isSystemAdmin || u.perfil === "ADMIN_COMERCIAL"

export const podeVerProjetos        = (u: UserAcesso) => u.isSystemAdmin || u.perfil === "MEMBRO_PROJETO"  || u.perfil === "ADMIN_PROJETO"
export const podeVerComercial       = (u: UserAcesso) => u.isSystemAdmin || u.perfil === "MEMBRO_COMERCIAL" || u.perfil === "ADMIN_COMERCIAL"
export const podeVerPainelProjetos  = (u: UserAcesso) => u.isSystemAdmin || u.perfil === "ADMIN_PROJETO"
export const podeVerPainelComercial = (u: UserAcesso) => u.isSystemAdmin || u.perfil === "ADMIN_COMERCIAL"

export const podeApagarOportunidade = (u: UserAcesso) => u.isSystemAdmin || u.perfil === "ADMIN_COMERCIAL"
export const podeGerenciarProjeto   = (u: UserAcesso) => u.isSystemAdmin || u.perfil === "ADMIN_PROJETO"
export const podeGerenciarUsuarios  = (u: UserAcesso) => u.isSystemAdmin

/** Membro comercial vê só as próprias; admin comercial e admin total veem todas */
export const filtroPropriasOportunidades = (u: UserAcesso): string | undefined =>
  !u.isSystemAdmin && u.perfil === "MEMBRO_COMERCIAL" ? "FILTRAR" : undefined

/** Área padrão de redirect para o perfil */
export const areaPadrao = (u: UserAcesso): string =>
  podeVerProjetos(u) ? "/projetos" : "/comercial"
