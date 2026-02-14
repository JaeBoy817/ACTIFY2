-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "ActivitiesCarePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "residentId" TEXT NOT NULL,
    "initiatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextReviewAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitiesCarePlan_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitiesCarePlanFocus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carePlanId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "etiologyFactors" JSONB,
    "baselineNarrative" TEXT NOT NULL,
    "strengths" TEXT,
    "preferences" TEXT,
    "barriersNotes" TEXT,
    "initiatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextReviewAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitiesCarePlanFocus_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "ActivitiesCarePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitiesCarePlanFocus_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitiesCarePlanGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "focusId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "measurementMethod" TEXT NOT NULL,
    "targetValue" INTEGER,
    "targetUnit" TEXT,
    "startAt" DATETIME NOT NULL,
    "targetAt" DATETIME NOT NULL,
    "reviewFrequencyDays" INTEGER,
    "residentParticipated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitiesCarePlanGoal_focusId_fkey" FOREIGN KEY ("focusId") REFERENCES "ActivitiesCarePlanFocus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitiesCarePlanGoal_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitiesCarePlanIntervention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "focusId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "personalizedApproach" TEXT NOT NULL,
    "frequencyType" TEXT NOT NULL,
    "frequencyValue" INTEGER,
    "responsibleRole" TEXT NOT NULL,
    "notificationMethod" TEXT NOT NULL,
    "transportRequired" BOOLEAN NOT NULL DEFAULT false,
    "transportDetails" TEXT,
    "bedBoundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bedBoundText" TEXT,
    "dementiaFriendlyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dementiaFriendlyText" TEXT,
    "lowVisionHearingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lowVisionHearingText" TEXT,
    "oneToOneMiniEnabled" BOOLEAN NOT NULL DEFAULT false,
    "oneToOneMiniText" TEXT,
    "suppliesNeeded" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitiesCarePlanIntervention_focusId_fkey" FOREIGN KEY ("focusId") REFERENCES "ActivitiesCarePlanFocus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitiesCarePlanIntervention_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitiesCarePlanIntervention_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "ActivitiesCarePlanGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitiesCarePlanTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interventionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assignedRole" TEXT NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "dueDate" DATETIME,
    "dueTime" TEXT,
    "daysOfWeek" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "completionRequiresNote" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitiesCarePlanTask_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "ActivitiesCarePlanIntervention" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitiesCarePlanTaskCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "completedByUserId" TEXT,
    CONSTRAINT "ActivitiesCarePlanTaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ActivitiesCarePlanTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitiesCarePlanEvidenceLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "residentId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "attendanceId" TEXT,
    "progressNoteId" TEXT,
    "focusId" TEXT,
    "goalId" TEXT,
    "linkNote" TEXT,
    "linkedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitiesCarePlanEvidenceLink_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitiesCarePlanEvidenceLink_focusId_fkey" FOREIGN KEY ("focusId") REFERENCES "ActivitiesCarePlanFocus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitiesCarePlanEvidenceLink_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "ActivitiesCarePlanGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitiesCarePlanReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carePlanId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetCompletionAt" DATETIME,
    "completionAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "completedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitiesCarePlanReview_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "ActivitiesCarePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitiesCarePlanReview_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Resident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "unitId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "bestTimesOfDay" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resident_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resident_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Resident" ("bestTimesOfDay", "createdAt", "facilityId", "firstName", "id", "isActive", "lastName", "notes", "room", "unitId") SELECT "bestTimesOfDay", "createdAt", "facilityId", "firstName", "id", "isActive", "lastName", "notes", "room", "unitId" FROM "Resident";
DROP TABLE "Resident";
ALTER TABLE "new_Resident" RENAME TO "Resident";
CREATE INDEX "Resident_facilityId_idx" ON "Resident"("facilityId");
CREATE INDEX "Resident_unitId_idx" ON "Resident"("unitId");
CREATE INDEX "Resident_status_idx" ON "Resident"("status");
CREATE INDEX "Resident_lastName_firstName_idx" ON "Resident"("lastName", "firstName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ActivitiesCarePlan_residentId_key" ON "ActivitiesCarePlan"("residentId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlan_residentId_idx" ON "ActivitiesCarePlan"("residentId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanFocus_carePlanId_idx" ON "ActivitiesCarePlanFocus"("carePlanId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanFocus_residentId_idx" ON "ActivitiesCarePlanFocus"("residentId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanFocus_status_category_idx" ON "ActivitiesCarePlanFocus"("status", "category");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanGoal_focusId_idx" ON "ActivitiesCarePlanGoal"("focusId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanGoal_residentId_idx" ON "ActivitiesCarePlanGoal"("residentId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanGoal_status_type_idx" ON "ActivitiesCarePlanGoal"("status", "type");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanIntervention_focusId_idx" ON "ActivitiesCarePlanIntervention"("focusId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanIntervention_goalId_idx" ON "ActivitiesCarePlanIntervention"("goalId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanIntervention_residentId_idx" ON "ActivitiesCarePlanIntervention"("residentId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanIntervention_status_isActive_idx" ON "ActivitiesCarePlanIntervention"("status", "isActive");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanTask_interventionId_idx" ON "ActivitiesCarePlanTask"("interventionId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanTask_active_scheduleType_idx" ON "ActivitiesCarePlanTask"("active", "scheduleType");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanTaskCompletion_taskId_completedAt_idx" ON "ActivitiesCarePlanTaskCompletion"("taskId", "completedAt");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanEvidenceLink_residentId_evidenceType_idx" ON "ActivitiesCarePlanEvidenceLink"("residentId", "evidenceType");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanEvidenceLink_focusId_idx" ON "ActivitiesCarePlanEvidenceLink"("focusId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanEvidenceLink_goalId_idx" ON "ActivitiesCarePlanEvidenceLink"("goalId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanReview_carePlanId_idx" ON "ActivitiesCarePlanReview"("carePlanId");

-- CreateIndex
CREATE INDEX "ActivitiesCarePlanReview_residentId_status_idx" ON "ActivitiesCarePlanReview"("residentId", "status");

