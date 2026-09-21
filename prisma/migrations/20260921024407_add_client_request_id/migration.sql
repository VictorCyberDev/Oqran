-- AlterTable
ALTER TABLE `case_notes` ADD COLUMN `clientRequestId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `cases` ADD COLUMN `clientRequestId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `incidents` ADD COLUMN `clientRequestId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `case_notes_clientRequestId_key` ON `case_notes`(`clientRequestId`);

-- CreateIndex
CREATE UNIQUE INDEX `cases_clientRequestId_key` ON `cases`(`clientRequestId`);

-- CreateIndex
CREATE UNIQUE INDEX `incidents_clientRequestId_key` ON `incidents`(`clientRequestId`);

