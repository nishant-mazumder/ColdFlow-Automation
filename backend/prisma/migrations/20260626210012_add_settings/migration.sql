-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "googleRefreshToken" TEXT,
    "dailyQuota" INTEGER NOT NULL DEFAULT 40,
    "minNewEmails" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
