-- CreateTable
CREATE TABLE "quack_like" (
    "id" TEXT NOT NULL,
    "quackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quack_like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quack_like_quackId_createdAt_idx" ON "quack_like"("quackId", "createdAt");

-- CreateIndex
CREATE INDEX "quack_like_userId_idx" ON "quack_like"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "quack_like_quackId_userId_key" ON "quack_like"("quackId", "userId");

-- AddForeignKey
ALTER TABLE "quack_like" ADD CONSTRAINT "quack_like_quackId_fkey" FOREIGN KEY ("quackId") REFERENCES "quack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quack_like" ADD CONSTRAINT "quack_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
