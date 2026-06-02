-- CreateEnum
CREATE TYPE "PerfilAcesso" AS ENUM ('COMERCIAL', 'PROJETOS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "perfil" "PerfilAcesso" NOT NULL DEFAULT 'PROJETOS';
