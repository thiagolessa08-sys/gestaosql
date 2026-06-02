# Perfis de Acesso — Comercial / Projetos / Admin

**Data:** 2026-06-02
**Status:** Aprovado

## Objetivo

Restringir o que cada usuário vê conforme seu perfil:
- **Admin** (`isSystemAdmin`): vê tudo (Projetos, Comercial, Painel, Configurações)
- **Comercial** (`perfil = COMERCIAL`): vê apenas Comercial + Configurações
- **Projetos** (`perfil = PROJETOS`): vê apenas Projetos + Configurações
- **Painel**: somente admin

Perfil é exclusivo (um usuário é Comercial OU Projetos). Admin ignora o perfil.

## Banco de Dados

```prisma
enum PerfilAcesso {
  COMERCIAL
  PROJETOS
}
```

No model `User`: `perfil PerfilAcesso @default(PROJETOS)`.

Migration: cria o enum e a coluna com default PROJETOS (usuários existentes ficam PROJETOS).

## Sessão (JWT)

`perfil` é incluído no token e na sessão — em `src/server/auth/config.ts` (authorize select + jwt + session) e em `src/server/auth/edge.ts` (jwt + session, para o middleware ler).

Tipos atualizados em `src/types/next-auth.d.ts`: `Session.user.perfil`, `User.perfil`, `JWT.perfil`.

## Guardas de Rota — Middleware (src/proxy.ts)

Após o check de `mustChangePassword`, aplicar (apenas para não-admin):
- `/comercial*` → exige `perfil === COMERCIAL`, senão redireciona para a área do usuário
- `/projetos*` → exige `perfil === PROJETOS`
- `/painel*` → exige admin

Redirect raiz `/`: admin/projetos → `/projetos`; comercial → `/comercial`.

Helper de "área default": admin ou PROJETOS → `/projetos`; COMERCIAL → `/comercial`.

## Sidebar (src/components/layout/SidebarNav.tsx)

Recebe `isSystemAdmin` e `perfil` via props do layout (`src/app/(app)/layout.tsx`). Filtra `NAV_LINKS`:
- Item Projetos → admin ou PROJETOS
- Item Comercial → admin ou COMERCIAL
- Item Painel → admin
- Item Configurações → todos

## UI de Gerenciamento (UserManagement.tsx)

Substitui o checkbox "Administrador do sistema" por um seletor **Tipo**: Admin / Comercial / Projetos.
- Admin → `isSystemAdmin=true`
- Comercial → `isSystemAdmin=false, perfil=COMERCIAL`
- Projetos → `isSystemAdmin=false, perfil=PROJETOS`

Na lista de usuários, cada linha tem um seletor de **Tipo** (Admin/Comercial/Projetos) que permite alterar o tipo do usuário existente via `adminUpdateUserTipoAction(userId, tipo)`. `adminCreateUserAction` recebe `tipo` e mapeia para isSystemAdmin/perfil. `createUser`, `findAllUsers` e a action de update passam a incluir `perfil`.

O próprio admin não pode rebaixar a si mesmo (seletor desabilitado na própria linha).

## Fora de escopo

- Granularidade por projeto (já existe via ProjectMember/Role)
