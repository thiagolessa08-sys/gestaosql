-- CreateTable
CREATE TABLE "oportunidade_subitens" (
    "id" TEXT NOT NULL,
    "oportunidade_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluido_em" TIMESTAMP(3),

    CONSTRAINT "oportunidade_subitens_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "oportunidade_subitens" ADD CONSTRAINT "oportunidade_subitens_oportunidade_id_fkey"
  FOREIGN KEY ("oportunidade_id") REFERENCES "oportunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
