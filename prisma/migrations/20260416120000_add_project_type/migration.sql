-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('WEB', 'MOBILE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "type" "ProjectType" NOT NULL DEFAULT 'WEB';

-- AlterTable
ALTER TABLE "Fragment" ADD COLUMN "type" "ProjectType" NOT NULL DEFAULT 'WEB',
ADD COLUMN "expoUrl" TEXT;
