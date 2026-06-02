-- CreateEnum
CREATE TYPE "EtapaComercial" AS ENUM ('SUSPECT', 'LEAD', 'ABORDAGEM', 'DOR_ADMITIDA', 'BUDGET_IDENTIFICADO', 'DIAGRAMA_PODER', 'LEVANTAMENTO_AMBIENTE', 'TR_ETP', 'AVALIACAO_CONCORRENCIA', 'PROPOSTA_EMITIDA', 'SHORT_LIST', 'DECISAO_DEFINIDA', 'LICITACAO', 'TERMOS_ACEITE', 'NEGOCIACAO_CONTRATO', 'ASSINATURA_CONTRATO');

-- CreateTable
CREATE TABLE "Oportunidade" (
    "id" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "produto" TEXT,
    "pov" TEXT,
    "propostaValor" TEXT,
    "mapeamento" TEXT,
    "apresentacao" TEXT,
    "valor" DECIMAL(14,2),
    "prazoFechamento" TIMESTAMP(3),
    "etapa" "EtapaComercial" NOT NULL DEFAULT 'SUSPECT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oportunidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OportunidadeResponsavel" (
    "oportunidadeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OportunidadeResponsavel_pkey" PRIMARY KEY ("oportunidadeId","userId")
);

-- AddForeignKey
ALTER TABLE "Oportunidade" ADD CONSTRAINT "Oportunidade_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OportunidadeResponsavel" ADD CONSTRAINT "OportunidadeResponsavel_oportunidadeId_fkey" FOREIGN KEY ("oportunidadeId") REFERENCES "Oportunidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OportunidadeResponsavel" ADD CONSTRAINT "OportunidadeResponsavel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
