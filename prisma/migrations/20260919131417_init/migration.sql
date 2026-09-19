-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `role` ENUM('CITIZEN', 'BUSINESS', 'BANK', 'GOVERNMENT', 'DEVELOPER', 'ADMIN', 'PLATFORM_OWNER') NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `authMethod` ENUM('SMS', 'EMAIL') NOT NULL DEFAULT 'SMS',
    `nin` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `displayName` VARCHAR(191) NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `organizationId` VARCHAR(191) NULL,
    `orgRole` ENUM('MEMBER', 'LEAD') NOT NULL DEFAULT 'MEMBER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_phone_key`(`phone`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_nin_key`(`nin`),
    INDEX `users_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizations` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('BANK', 'GOVERNMENT', 'BUSINESS') NOT NULL,
    `inviteCode` VARCHAR(191) NOT NULL,
    `verificationStatus` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `registrationRef` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_inviteCode_key`(`inviteCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `planTier` ENUM('FREE', 'STANDARD', 'ENTERPRISE') NOT NULL DEFAULT 'FREE',
    `status` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED') NOT NULL DEFAULT 'TRIAL',
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `billingCycle` ENUM('MONTHLY', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscriptions_organizationId_key`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_codes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `target` VARCHAR(191) NOT NULL,
    `purpose` ENUM('SIGN_IN', 'CREATE_ACCOUNT', 'ORG_VERIFY') NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_codes_target_purpose_idx`(`target`, `purpose`),
    INDEX `otp_codes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trusted_devices` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceTokenHash` VARCHAR(191) NOT NULL,
    `pinHash` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `approxLocation` VARCHAR(191) NULL,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `trusted_devices_deviceTokenHash_key`(`deviceTokenHash`),
    INDEX `trusted_devices_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addresses` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `confidenceTier` ENUM('NIMC_CERTIFIED', 'STATE_GIS', 'CROWD_REPORTED') NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `postcode` VARCHAR(191) NULL,
    `zoneType` VARCHAR(191) NULL,
    `severity` ENUM('LOW', 'GUARDED', 'ELEVATED', 'CRITICAL') NOT NULL DEFAULT 'LOW',
    `verifiedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `addresses_latitude_longitude_idx`(`latitude`, `longitude`),
    INDEX `addresses_verifiedById_idx`(`verifiedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incidents` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `severity` ENUM('LOW', 'GUARDED', 'ELEVATED', 'CRITICAL') NOT NULL,
    `description` VARCHAR(191) NULL,
    `addressId` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `reporterId` VARCHAR(191) NULL,
    `status` ENUM('SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'SUBMITTED',
    `referenceCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `incidents_referenceCode_key`(`referenceCode`),
    INDEX `incidents_addressId_idx`(`addressId`),
    INDEX `incidents_reporterId_idx`(`reporterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_ledger` (
    `id` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL AUTO_INCREMENT,
    `payload` JSON NOT NULL,
    `prevHash` VARCHAR(191) NOT NULL,
    `currentHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `risk_ledger_sequence_key`(`sequence`),
    UNIQUE INDEX `risk_ledger_currentHash_key`(`currentHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fraud_signals` (
    `id` VARCHAR(191) NOT NULL,
    `addressId` VARCHAR(191) NULL,
    `entityLabel` VARCHAR(191) NOT NULL,
    `signalType` VARCHAR(191) NOT NULL,
    `severity` ENUM('LOW', 'GUARDED', 'ELEVATED', 'CRITICAL') NOT NULL,
    `source` ENUM('INTERNAL_REPORT', 'PUBLIC_WATCHLIST') NOT NULL,
    `watchlistRef` VARCHAR(191) NULL,
    `flaggedById` VARCHAR(191) NULL,
    `flaggedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `slaDeadline` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedById` VARCHAR(191) NULL,

    INDEX `fraud_signals_addressId_idx`(`addressId`),
    INDEX `fraud_signals_slaDeadline_idx`(`slaDeadline`),
    INDEX `fraud_signals_flaggedById_idx`(`flaggedById`),
    INDEX `fraud_signals_resolvedById_idx`(`resolvedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_log` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `device` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_log_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_clients` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `apiKeyHash` VARCHAR(191) NOT NULL,
    `apiKeyPrefix` VARCHAR(191) NOT NULL,
    `scopes` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `api_clients_apiKeyHash_key`(`apiKeyHash`),
    INDEX `api_clients_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_usage` (
    `id` VARCHAR(191) NOT NULL,
    `apiClientId` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `statusCode` INTEGER NOT NULL,
    `billableUnits` INTEGER NOT NULL DEFAULT 1,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_usage_apiClientId_requestedAt_idx`(`apiClientId`, `requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zones` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `radiusKm` DOUBLE NOT NULL DEFAULT 2,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `zones_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limit_buckets` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `windowStart` DATETIME(3) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `rate_limit_buckets_key_windowStart_key`(`key`, `windowStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pending_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NULL,
    `requestedRole` ENUM('CITIZEN', 'BUSINESS', 'BANK', 'GOVERNMENT', 'DEVELOPER', 'ADMIN', 'PLATFORM_OWNER') NOT NULL,
    `isLeadRequest` BOOLEAN NOT NULL DEFAULT false,
    `referenceCode` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` VARCHAR(191) NULL,
    `reviewNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `pending_approvals_userId_key`(`userId`),
    UNIQUE INDEX `pending_approvals_referenceCode_key`(`referenceCode`),
    INDEX `pending_approvals_organizationId_idx`(`organizationId`),
    INDEX `pending_approvals_reviewedById_idx`(`reviewedById`),
    INDEX `pending_approvals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

