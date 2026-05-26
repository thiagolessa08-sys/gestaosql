-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "main_activity_id" TEXT;

-- CreateTable
CREATE TABLE "main_activities" (
    "id" TEXT NOT NULL,
    "sprint_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "main_activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_main_activity_id_fkey" FOREIGN KEY ("main_activity_id") REFERENCES "main_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_activities" ADD CONSTRAINT "main_activities_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
