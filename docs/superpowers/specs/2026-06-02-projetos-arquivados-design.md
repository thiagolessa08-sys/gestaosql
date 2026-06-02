# Projetos Arquivados — Visualizar, Restaurar e Apagar

**Data:** 2026-06-02
**Status:** Aprovado

## Objetivo

Permitir que o admin veja os projetos arquivados, restaure (desarquive) e apague permanentemente (cascata).

## Backend

### Repository (`src/server/repositories/projects.ts`)
- `findArchivedProjects()` — `where: { archivedAt: { not: null } }`, mesmo include da lista, ordenado por `archivedAt desc`.
- `unarchiveProject(id)` — `update { archivedAt: null }`.
- `deleteProjectCascade(id)` — `db.$transaction([...])` apagando nesta ordem (filhos → pai):
  1. `cardTag.deleteMany({ where: { card: { projectId: id } } })`
  2. `comment.deleteMany({ where: { card: { projectId: id } } })`
  3. `checklistItem.deleteMany({ where: { card: { projectId: id } } })`
  4. `attachment.deleteMany({ where: { card: { projectId: id } } })`
  5. `cardStatusTransition.deleteMany({ where: { card: { projectId: id } } })`
  6. `sprintCardSnapshot.deleteMany({ where: { sprint: { projectId: id } } })`
  7. `mainActivity.deleteMany({ where: { sprint: { projectId: id } } })`
  8. `card.deleteMany({ where: { projectId: id } })`
  9. `sprint.deleteMany({ where: { projectId: id } })`
  10. `tag.deleteMany({ where: { projectId: id } })`
  11. `projectInvitation.deleteMany({ where: { projectId: id } })`
  12. `projectMember.deleteMany({ where: { projectId: id } })`
  13. `auditLog.deleteMany({ where: { projectId: id } })`
  14. `project.delete({ where: { id } })`

### Service (`src/server/services/projects.ts`)
- `unarchiveProject(id)` e `deleteProjectCascade(id)` delegando ao repository.

### Actions (`src/server/actions/projects.ts`)
- `unarchiveProjectAction(projectId)` — exige `session.user.isSystemAdmin`; `revalidatePath("/projetos")`.
- `deleteProjectAction(projectId)` — exige `session.user.isSystemAdmin`; cascata; `revalidatePath("/projetos")`.

Ambas retornam o `ActionResult` padrão do projeto.

## UI

### Página de projetos (`src/app/(app)/projetos/page.tsx`)
- Server component carrega projetos ativos (como hoje) e, se admin, também os arquivados via `findArchivedProjects()`.
- Passa `isSystemAdmin` e a lista de arquivados para um componente cliente que controla a aba.

### Componente de abas (novo: `src/components/projects/ProjectsTabs.tsx`)
- Renderiza alternador **Ativos | Arquivados** (a aba Arquivados só aparece para admin).
- Aba Ativos: grid atual de `ProjectCard`.
- Aba Arquivados: lista de `ArchivedProjectRow` (novo) com nome, data de arquivamento e botões **Restaurar** e **Apagar**.

### ArchivedProjectRow (novo)
- Botão **Restaurar** → `unarchiveProjectAction`, `router.refresh()`.
- Botão **Apagar** → confirmação dupla (1º clique vira "Confirmar exclusão"), depois `deleteProjectAction`, `router.refresh()`.

## Permissões
- Restaurar e Apagar: somente admin (validado na action, server-side). A UI da aba Arquivados só é exibida para admin.

## Fora de escopo
- Remoção dos arquivos físicos de anexos no disco (`storagePath`) — só os registros do banco são apagados.
- Restauração de projetos já apagados (delete é irreversível).
