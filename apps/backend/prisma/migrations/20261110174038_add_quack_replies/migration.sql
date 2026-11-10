-- AlterTable
ALTER TABLE "quack" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "quack_parentId_idx" ON "quack"("parentId");

-- CreateIndex
CREATE INDEX "quack_deletedAt_idx" ON "quack"("deletedAt");

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
