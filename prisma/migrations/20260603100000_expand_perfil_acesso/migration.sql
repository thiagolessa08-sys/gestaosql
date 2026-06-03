-- Alterar coluna para TEXT temporariamente
ALTER TABLE "users" ALTER COLUMN "perfil" TYPE TEXT;
ALTER TABLE "users" ALTER COLUMN "perfil" DROP DEFAULT;

-- Dropar enum antigo
DROP TYPE "PerfilAcesso";

-- Criar novo enum com 4 valores
CREATE TYPE "PerfilAcesso" AS ENUM ('MEMBRO_PROJETO', 'MEMBRO_COMERCIAL', 'ADMIN_PROJETO', 'ADMIN_COMERCIAL');

-- Migrar valores existentes
UPDATE "users" SET "perfil" = 'MEMBRO_PROJETO'   WHERE "perfil" = 'PROJETOS';
UPDATE "users" SET "perfil" = 'MEMBRO_COMERCIAL' WHERE "perfil" = 'COMERCIAL';

-- Restaurar tipo e default
ALTER TABLE "users" ALTER COLUMN "perfil" TYPE "PerfilAcesso" USING "perfil"::"PerfilAcesso";
ALTER TABLE "users" ALTER COLUMN "perfil" SET DEFAULT 'MEMBRO_PROJETO'::"PerfilAcesso";
