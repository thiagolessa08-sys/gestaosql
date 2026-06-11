-- CreateTable
CREATE TABLE "tags_comercial" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oportunidade_tags_comercial" (
    "oportunidade_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "oportunidade_tags_comercial_pkey" PRIMARY KEY ("oportunidade_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_comercial_nome_key" ON "tags_comercial"("nome");

-- AddForeignKey
ALTER TABLE "oportunidade_tags_comercial" ADD CONSTRAINT "oportunidade_tags_comercial_oportunidade_id_fkey" FOREIGN KEY ("oportunidade_id") REFERENCES "oportunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oportunidade_tags_comercial" ADD CONSTRAINT "oportunidade_tags_comercial_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags_comercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
