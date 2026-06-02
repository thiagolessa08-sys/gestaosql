-- Drop OportunidadeResponsavel (N:N table no longer needed)
DROP TABLE IF EXISTS "OportunidadeResponsavel";

-- Change etapa to TEXT temporarily to allow enum replacement
ALTER TABLE "Oportunidade" ALTER COLUMN "etapa" TYPE TEXT;
ALTER TABLE "Oportunidade" ALTER COLUMN "etapa" DROP DEFAULT;

-- Map any old enum values that don't exist in new enum to SUSPECT
UPDATE "Oportunidade" SET "etapa" = 'SUSPECT'
WHERE "etapa" NOT IN ('SUSPECT', 'LEAD', 'PROSPECT_C', 'PROSPECT_B', 'PROSPECT_A', 'CONCLUIDO', 'PERDIDO');

-- Drop old enum and create simplified 7-value enum
DROP TYPE "EtapaComercial";
CREATE TYPE "EtapaComercial" AS ENUM ('SUSPECT', 'LEAD', 'PROSPECT_C', 'PROSPECT_B', 'PROSPECT_A', 'CONCLUIDO', 'PERDIDO');

-- Restore enum column with new type
ALTER TABLE "Oportunidade" ALTER COLUMN "etapa" TYPE "EtapaComercial" USING "etapa"::"EtapaComercial";
ALTER TABLE "Oportunidade" ALTER COLUMN "etapa" SET DEFAULT 'SUSPECT'::"EtapaComercial";

-- Drop old columns
ALTER TABLE "Oportunidade" DROP COLUMN IF EXISTS "pov";
ALTER TABLE "Oportunidade" DROP COLUMN IF EXISTS "propostaValor";
ALTER TABLE "Oportunidade" DROP COLUMN IF EXISTS "mapeamento";
ALTER TABLE "Oportunidade" DROP COLUMN IF EXISTS "apresentacao";

-- Add new columns
ALTER TABLE "Oportunidade" ADD COLUMN IF NOT EXISTS "origem_lead" TEXT;
ALTER TABLE "Oportunidade" ADD COLUMN IF NOT EXISTS "descricao" TEXT;
ALTER TABLE "Oportunidade" ADD COLUMN IF NOT EXISTS "responsavel_id" TEXT;

-- Rename columns to snake_case
ALTER TABLE "Oportunidade" RENAME COLUMN "prazoFechamento" TO "prazo_fechamento";
ALTER TABLE "Oportunidade" RENAME COLUMN "createdById" TO "created_by_id";
ALTER TABLE "Oportunidade" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Oportunidade" RENAME COLUMN "updatedAt" TO "updated_at";

-- Drop old foreign key before renaming table
ALTER TABLE "Oportunidade" DROP CONSTRAINT IF EXISTS "Oportunidade_createdById_fkey";

-- Rename table
ALTER TABLE "Oportunidade" RENAME TO "oportunidades";

-- Re-add foreign key for createdBy with new column name
ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign key for responsavel
ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_responsavel_id_fkey"
  FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
