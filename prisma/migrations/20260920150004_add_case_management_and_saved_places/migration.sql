-- CreateTable
CREATE TABLE `cases` (
    `id` VARCHAR(191) NOT NULL,
    `referenceCode` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `source` ENUM('CITIZEN_REPORT', 'BANK_ESCALATION', 'INVESTIGATOR_FLAG') NOT NULL,
    `status` ENUM('OPEN', 'UNDER_INVESTIGATION', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `severity` ENUM('LOW', 'GUARDED', 'ELEVATED', 'CRITICAL') NOT NULL,
    `summary` TEXT NULL,
    `originLabel` VARCHAR(191) NULL,
    `addressId` VARCHAR(191) NULL,
    `incidentId` VARCHAR(191) NULL,
    `fraudSignalId` VARCHAR(191) NULL,
    `raisedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cases_referenceCode_key`(`referenceCode`),
    INDEX `cases_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `cases_addressId_idx`(`addressId`),
    INDEX `cases_incidentId_idx`(`incidentId`),
    INDEX `cases_fraudSignalId_idx`(`fraudSignalId`),
    INDEX `cases_raisedById_idx`(`raisedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_notes` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `case_notes_caseId_createdAt_idx`(`caseId`, `createdAt`),
    INDEX `case_notes_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_places` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `addressId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `lastSeenSeverity` ENUM('LOW', 'GUARDED', 'ELEVATED', 'CRITICAL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `saved_places_userId_idx`(`userId`),
    UNIQUE INDEX `saved_places_userId_addressId_key`(`userId`, `addressId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

