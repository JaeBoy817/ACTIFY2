-- CreateTable
CREATE TABLE "FacilitySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "businessHoursJson" JSONB NOT NULL,
    "roomFormatRule" TEXT NOT NULL DEFAULT 'A_B',
    "roomFormatHint" TEXT,
    "printDefaultsJson" JSONB NOT NULL,
    "policyFlagsJson" JSONB NOT NULL,
    "moduleFlagsJson" JSONB NOT NULL,
    "attendanceRulesJson" JSONB NOT NULL,
    "documentationRulesJson" JSONB NOT NULL,
    "carePlanRulesJson" JSONB NOT NULL,
    "reportSettingsJson" JSONB NOT NULL,
    "inventoryDefaultsJson" JSONB NOT NULL,
    "prizeCartDefaultsJson" JSONB NOT NULL,
    "notificationDefaultsJson" JSONB NOT NULL,
    "complianceJson" JSONB NOT NULL,
    "permissionsJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FacilitySettings_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "defaultLanding" TEXT NOT NULL DEFAULT 'DASHBOARD',
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "fontScale" TEXT NOT NULL DEFAULT 'MD',
    "myQuickPhrasesJson" JSONB NOT NULL,
    "printPrefsJson" JSONB NOT NULL,
    "shortcutsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FacilitySettings_facilityId_key" ON "FacilitySettings"("facilityId");

-- CreateIndex
CREATE INDEX "FacilitySettings_facilityId_idx" ON "FacilitySettings"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");
