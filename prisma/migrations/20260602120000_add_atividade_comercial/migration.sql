-- CreateEnum
CREATE TYPE "AtividadeComercial" AS ENUM ('MAPEAMENTO', 'APRESENTACAO', 'DESPERTOU_INTERESSE', 'ABORDAGEM', 'DOR_ADMITIDA', 'BUDGET_IDENTIFICADO', 'DIAGRAMA_PODER', 'LEVANTAMENTO_AMBIENTE', 'TR_ETP', 'AVALIACAO_CONCORRENCIA', 'PROPOSTA_EMITIDA', 'SHORT_LIST', 'DECISAO_DEFINIDA', 'LICITACAO', 'TERMOS_ACEITE', 'NEGOCIACAO_CONTRATO', 'ASSINATURA_CONTRATO');

-- AlterTable
ALTER TABLE "oportunidades" ADD COLUMN "atividade" "AtividadeComercial";

-- Backfill: define a primeira atividade de cada coluna para os cards existentes
UPDATE "oportunidades" SET "atividade" = 'MAPEAMENTO'          WHERE "etapa" = 'SUSPECT';
UPDATE "oportunidades" SET "atividade" = 'DESPERTOU_INTERESSE' WHERE "etapa" = 'LEAD';
UPDATE "oportunidades" SET "atividade" = 'ABORDAGEM'           WHERE "etapa" = 'PROSPECT_C';
UPDATE "oportunidades" SET "atividade" = 'LEVANTAMENTO_AMBIENTE' WHERE "etapa" = 'PROSPECT_B';
UPDATE "oportunidades" SET "atividade" = 'LICITACAO'           WHERE "etapa" = 'PROSPECT_A';
-- CONCLUIDO e PERDIDO permanecem com atividade NULL
