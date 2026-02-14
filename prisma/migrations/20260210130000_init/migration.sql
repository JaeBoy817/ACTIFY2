-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AD',
    "facilityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "moduleFlags" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Unit_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "unitId" TEXT,
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

-- CreateTable
CREATE TABLE "InterestAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "residentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "dislikesTriggers" TEXT,
    "suggestedPrograms" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterestAssessment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "supplies" TEXT NOT NULL,
    "setupSteps" TEXT NOT NULL,
    "adaptations" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL,
    "defaultChecklist" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityTemplate_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "adaptationsEnabled" JSONB NOT NULL,
    "checklist" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityInstance_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ActivityTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityInstanceId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "notifiedAt" DATETIME,
    "method" TEXT NOT NULL DEFAULT 'PRINT',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invitation_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityInstanceId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "barrierReason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CarePlanGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "residentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetMetric" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CarePlanGoal_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "noteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalLink_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "CarePlanGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalLink_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalLink_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "ProgressNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressNoteTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quickPhrases" JSONB NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressNoteTemplate_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "residentId" TEXT NOT NULL,
    "activityInstanceId" TEXT,
    "type" TEXT NOT NULL,
    "participationLevel" TEXT NOT NULL,
    "moodAffect" TEXT NOT NULL,
    "cuesRequired" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "followUp" TEXT,
    "narrative" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "ProgressNote_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressNote_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProgressNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "requirements" JSONB NOT NULL,
    CONSTRAINT "Volunteer_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VolunteerVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "assignedLocation" TEXT NOT NULL,
    "signedInByUserId" TEXT NOT NULL,
    "signedOutByUserId" TEXT,
    "notes" TEXT,
    CONSTRAINT "VolunteerVisit_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerVisit_signedInByUserId_fkey" FOREIGN KEY ("signedInByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerVisit_signedOutByUserId_fkey" FOREIGN KEY ("signedOutByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "onHand" INTEGER NOT NULL,
    "reorderAt" INTEGER NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryTxn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "InventoryTxn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryTxn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrizeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "onHand" INTEGER NOT NULL,
    "reorderAt" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrizeItem_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrizeTxn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prizeItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "PrizeTxn_prizeItemId_fkey" FOREIGN KEY ("prizeItemId") REFERENCES "PrizeItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrizeTxn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResidentCouncilMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "heldAt" DATETIME NOT NULL,
    "attendanceCount" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "ResidentCouncilMeeting_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResidentCouncilItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "concern" TEXT NOT NULL,
    "followUp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
    "owner" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResidentCouncilItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "ResidentCouncilMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FamilyEngagementNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "residentId" TEXT NOT NULL,
    "bestContactTimes" TEXT,
    "preferences" TEXT,
    "calmingThings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyEngagementNote_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NONE',
    "currentPeriodEnd" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE INDEX "User_facilityId_idx" ON "User"("facilityId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Unit_facilityId_idx" ON "Unit"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_facilityId_name_key" ON "Unit"("facilityId", "name");

-- CreateIndex
CREATE INDEX "Resident_facilityId_idx" ON "Resident"("facilityId");

-- CreateIndex
CREATE INDEX "Resident_unitId_idx" ON "Resident"("unitId");

-- CreateIndex
CREATE INDEX "Resident_lastName_firstName_idx" ON "Resident"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "InterestAssessment_residentId_idx" ON "InterestAssessment"("residentId");

-- CreateIndex
CREATE INDEX "ActivityTemplate_facilityId_idx" ON "ActivityTemplate"("facilityId");

-- CreateIndex
CREATE INDEX "ActivityTemplate_category_idx" ON "ActivityTemplate"("category");

-- CreateIndex
CREATE INDEX "ActivityInstance_facilityId_idx" ON "ActivityInstance"("facilityId");

-- CreateIndex
CREATE INDEX "ActivityInstance_templateId_idx" ON "ActivityInstance"("templateId");

-- CreateIndex
CREATE INDEX "ActivityInstance_startAt_idx" ON "ActivityInstance"("startAt");

-- CreateIndex
CREATE INDEX "Invitation_activityInstanceId_idx" ON "Invitation"("activityInstanceId");

-- CreateIndex
CREATE INDEX "Invitation_residentId_idx" ON "Invitation"("residentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_activityInstanceId_residentId_key" ON "Invitation"("activityInstanceId", "residentId");

-- CreateIndex
CREATE INDEX "Attendance_activityInstanceId_idx" ON "Attendance"("activityInstanceId");

-- CreateIndex
CREATE INDEX "Attendance_residentId_idx" ON "Attendance"("residentId");

-- CreateIndex
CREATE INDEX "Attendance_barrierReason_idx" ON "Attendance"("barrierReason");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_activityInstanceId_residentId_key" ON "Attendance"("activityInstanceId", "residentId");

-- CreateIndex
CREATE INDEX "CarePlanGoal_residentId_idx" ON "CarePlanGoal"("residentId");

-- CreateIndex
CREATE INDEX "CarePlanGoal_type_idx" ON "CarePlanGoal"("type");

-- CreateIndex
CREATE INDEX "GoalLink_goalId_idx" ON "GoalLink"("goalId");

-- CreateIndex
CREATE INDEX "GoalLink_attendanceId_idx" ON "GoalLink"("attendanceId");

-- CreateIndex
CREATE INDEX "GoalLink_noteId_idx" ON "GoalLink"("noteId");

-- CreateIndex
CREATE INDEX "ProgressNoteTemplate_facilityId_idx" ON "ProgressNoteTemplate"("facilityId");

-- CreateIndex
CREATE INDEX "ProgressNote_residentId_idx" ON "ProgressNote"("residentId");

-- CreateIndex
CREATE INDEX "ProgressNote_activityInstanceId_idx" ON "ProgressNote"("activityInstanceId");

-- CreateIndex
CREATE INDEX "ProgressNote_createdByUserId_idx" ON "ProgressNote"("createdByUserId");

-- CreateIndex
CREATE INDEX "Volunteer_facilityId_idx" ON "Volunteer"("facilityId");

-- CreateIndex
CREATE INDEX "VolunteerVisit_volunteerId_idx" ON "VolunteerVisit"("volunteerId");

-- CreateIndex
CREATE INDEX "VolunteerVisit_startAt_idx" ON "VolunteerVisit"("startAt");

-- CreateIndex
CREATE INDEX "InventoryItem_facilityId_idx" ON "InventoryItem"("facilityId");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "InventoryTxn_itemId_idx" ON "InventoryTxn"("itemId");

-- CreateIndex
CREATE INDEX "InventoryTxn_createdAt_idx" ON "InventoryTxn"("createdAt");

-- CreateIndex
CREATE INDEX "PrizeItem_facilityId_idx" ON "PrizeItem"("facilityId");

-- CreateIndex
CREATE INDEX "PrizeTxn_prizeItemId_idx" ON "PrizeTxn"("prizeItemId");

-- CreateIndex
CREATE INDEX "PrizeTxn_createdAt_idx" ON "PrizeTxn"("createdAt");

-- CreateIndex
CREATE INDEX "ResidentCouncilMeeting_facilityId_idx" ON "ResidentCouncilMeeting"("facilityId");

-- CreateIndex
CREATE INDEX "ResidentCouncilMeeting_heldAt_idx" ON "ResidentCouncilMeeting"("heldAt");

-- CreateIndex
CREATE INDEX "ResidentCouncilItem_meetingId_idx" ON "ResidentCouncilItem"("meetingId");

-- CreateIndex
CREATE INDEX "ResidentCouncilItem_status_idx" ON "ResidentCouncilItem"("status");

-- CreateIndex
CREATE INDEX "FamilyEngagementNote_residentId_idx" ON "FamilyEngagementNote"("residentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_facilityId_key" ON "Subscription"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "AuditLog_facilityId_idx" ON "AuditLog"("facilityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

