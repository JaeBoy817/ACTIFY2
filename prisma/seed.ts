import {
  AttendanceStatus,
  BarrierReason,
  CuesRequired,
  MoodAffect,
  ParticipationLevel,
  Prisma,
  PrismaClient,
  ProgressNoteType,
  ResponseType,
  Role
} from "@prisma/client";
import { addDays, addHours } from "date-fns";

import { defaultModuleFlags } from "../lib/module-flags";
import { defaultFacilitySettingsInput, defaultUserSettingsInput } from "../lib/settings/defaults";

const prisma = new PrismaClient();

async function main() {
  const facility = await prisma.facility.upsert({
    where: { id: "seed_facility_id" },
    update: {
      moduleFlags: defaultModuleFlags
    },
    create: {
      id: "seed_facility_id",
      name: "Sample Facility",
      timezone: "America/New_York",
      moduleFlags: defaultModuleFlags
    }
  });

  const admin = await prisma.user.upsert({
    where: { clerkUserId: "seed-admin" },
    update: {
      role: Role.ADMIN,
      facilityId: facility.id
    },
    create: {
      clerkUserId: "seed-admin",
      email: "admin@actify.local",
      name: "Seed Admin",
      role: Role.ADMIN,
      facilityId: facility.id
    }
  });

  await prisma.facilitySettings.upsert({
    where: { facilityId: facility.id },
    update: {
      ...defaultFacilitySettingsInput({
        timezone: facility.timezone,
        moduleFlags: facility.moduleFlags
      })
    },
    create: {
      facilityId: facility.id,
      ...defaultFacilitySettingsInput({
        timezone: facility.timezone,
        moduleFlags: facility.moduleFlags
      })
    }
  });

  await prisma.userSettings.upsert({
    where: { userId: admin.id },
    update: defaultUserSettingsInput(),
    create: {
      userId: admin.id,
      ...defaultUserSettingsInput()
    }
  });

  const unitA = await prisma.unit.upsert({
    where: { facilityId_name: { facilityId: facility.id, name: "1st Floor" } },
    update: {},
    create: {
      facilityId: facility.id,
      name: "1st Floor"
    }
  });

  const unitB = await prisma.unit.upsert({
    where: { facilityId_name: { facilityId: facility.id, name: "2nd Floor" } },
    update: {},
    create: {
      facilityId: facility.id,
      name: "2nd Floor"
    }
  });

  const residents = [
    { firstName: "Martha", lastName: "Lane", room: "101", unitId: unitA.id },
    { firstName: "Eleanor", lastName: "Reed", room: "102", unitId: unitA.id },
    { firstName: "James", lastName: "Porter", room: "103", unitId: unitA.id },
    { firstName: "Victor", lastName: "Cole", room: "201", unitId: unitB.id },
    { firstName: "Sofia", lastName: "Ruiz", room: "202", unitId: unitB.id },
    { firstName: "Howard", lastName: "King", room: "203", unitId: unitB.id }
  ];

  for (const resident of residents) {
    await prisma.resident.upsert({
      where: {
        id: `${resident.firstName.toLowerCase()}_${resident.lastName.toLowerCase()}`
      },
      update: {
        facilityId: facility.id,
        unitId: resident.unitId,
        room: resident.room,
        isActive: true
      },
      create: {
        id: `${resident.firstName.toLowerCase()}_${resident.lastName.toLowerCase()}`,
        facilityId: facility.id,
        unitId: resident.unitId,
        firstName: resident.firstName,
        lastName: resident.lastName,
        room: resident.room,
        bestTimesOfDay: "Morning",
        notes: "Enjoys social programming",
        isActive: true
      }
    });
  }

  const templates = [
    {
      title: "Bingo",
      category: "Games",
      supplies: "Cards, markers, prizes",
      setupSteps: "Set tables, distribute cards, test microphone",
      difficulty: "Low"
    },
    {
      title: "Chair Exercise",
      category: "Wellness",
      supplies: "Bands, chairs, water",
      setupSteps: "Arrange chairs in circle, prep bands",
      difficulty: "Moderate"
    },
    {
      title: "Trivia: 90s",
      category: "Cognition",
      supplies: "Trivia cards, whiteboard",
      setupSteps: "Print rounds, setup scoreboard",
      difficulty: "Moderate"
    },
    {
      title: "Men's Club",
      category: "Social",
      supplies: "Discussion prompts, coffee",
      setupSteps: "Prepare topic cards and refreshment cart",
      difficulty: "Low"
    },
    {
      title: "Music Social",
      category: "Music",
      supplies: "Speaker, playlist, lyric sheets",
      setupSteps: "Build playlist and print lyric pages",
      difficulty: "Low"
    }
  ];

  const templateIds: string[] = [];
  for (const [idx, template] of templates.entries()) {
    const row = await prisma.activityTemplate.upsert({
      where: { id: `seed_template_${idx}` },
      update: {
        facilityId: facility.id,
        title: template.title,
        category: template.category,
        supplies: template.supplies,
        setupSteps: template.setupSteps,
        difficulty: template.difficulty,
        adaptations: {
          bedBound: "Use bedside conversation + simplified materials",
          dementiaFriendly: "Shorten rounds and provide visual cues",
          lowVisionHearing: "Large print handouts and amplified sound",
          oneToOneMini: "10-minute focused mini session"
        },
        defaultChecklist: ["Set room", "Gather supplies", "Prepare attendance sheet"]
      },
      create: {
        id: `seed_template_${idx}`,
        facilityId: facility.id,
        title: template.title,
        category: template.category,
        supplies: template.supplies,
        setupSteps: template.setupSteps,
        difficulty: template.difficulty,
        adaptations: {
          bedBound: "Use bedside conversation + simplified materials",
          dementiaFriendly: "Shorten rounds and provide visual cues",
          lowVisionHearing: "Large print handouts and amplified sound",
          oneToOneMini: "10-minute focused mini session"
        },
        defaultChecklist: ["Set room", "Gather supplies", "Prepare attendance sheet"]
      }
    });

    templateIds.push(row.id);
  }

  await prisma.progressNoteTemplate.upsert({
    where: { id: "seed_note_template_1" },
    update: {
      facilityId: facility.id,
      title: "Group Participation",
      bodyTemplate: "Resident attended group activity and demonstrated engaged behavior.",
      quickPhrases: [
        "Required occasional verbal cueing.",
        "Maintained attention for most of session.",
        "Benefited from peer interaction."
      ]
    },
    create: {
      id: "seed_note_template_1",
      facilityId: facility.id,
      title: "Group Participation",
      bodyTemplate: "Resident attended group activity and demonstrated engaged behavior.",
      quickPhrases: [
        "Required occasional verbal cueing.",
        "Maintained attention for most of session.",
        "Benefited from peer interaction."
      ]
    }
  });

  await prisma.progressNoteTemplate.upsert({
    where: { id: "seed_note_template_2" },
    update: {
      facilityId: facility.id,
      title: "1:1 Emotional Support",
      bodyTemplate: "Resident participated in a focused 1:1 interaction.",
      quickPhrases: [
        "Demonstrated improved mood by end of session.",
        "Responded well to reminiscence prompts.",
        "Follow-up visit recommended tomorrow."
      ]
    },
    create: {
      id: "seed_note_template_2",
      facilityId: facility.id,
      title: "1:1 Emotional Support",
      bodyTemplate: "Resident participated in a focused 1:1 interaction.",
      quickPhrases: [
        "Demonstrated improved mood by end of session.",
        "Responded well to reminiscence prompts.",
        "Follow-up visit recommended tomorrow."
      ]
    }
  });

  const today = new Date();
  const instance = await prisma.activityInstance.upsert({
    where: { id: "seed_instance_1" },
    update: {
      facilityId: facility.id,
      templateId: templateIds[0],
      title: "Bingo",
      startAt: addHours(today, 2),
      endAt: addHours(today, 3),
      location: "Main Lounge",
      adaptationsEnabled: {
        bedBound: false,
        dementiaFriendly: true,
        lowVisionHearing: true,
        oneToOneMini: false,
        overrides: {}
      },
      checklist: [
        { text: "Set up tables", done: true },
        { text: "Print attendance roster", done: false }
      ]
    },
    create: {
      id: "seed_instance_1",
      facilityId: facility.id,
      templateId: templateIds[0],
      title: "Bingo",
      startAt: addHours(today, 2),
      endAt: addHours(today, 3),
      location: "Main Lounge",
      adaptationsEnabled: {
        bedBound: false,
        dementiaFriendly: true,
        lowVisionHearing: true,
        oneToOneMini: false,
        overrides: {}
      },
      checklist: [
        { text: "Set up tables", done: true },
        { text: "Print attendance roster", done: false }
      ]
    }
  });

  const martha = await prisma.resident.findUniqueOrThrow({ where: { id: "martha_lane" } });

  const goal = await prisma.carePlanGoal.upsert({
    where: { id: "seed_goal_1" },
    update: {
      residentId: martha.id,
      type: "SOCIALIZATION",
      description: "Participate in group activity 3x weekly",
      targetMetric: "3/week",
      isActive: true
    },
    create: {
      id: "seed_goal_1",
      residentId: martha.id,
      type: "SOCIALIZATION",
      description: "Participate in group activity 3x weekly",
      targetMetric: "3/week",
      isActive: true
    }
  });

  const attendance = await prisma.attendance.upsert({
    where: {
      activityInstanceId_residentId: {
        activityInstanceId: instance.id,
        residentId: martha.id
      }
    },
    update: {
      status: AttendanceStatus.ACTIVE,
      barrierReason: null,
      notes: "Engaged for full session"
    },
    create: {
      activityInstanceId: instance.id,
      residentId: martha.id,
      status: AttendanceStatus.ACTIVE,
      notes: "Engaged for full session"
    }
  });

  const note = await prisma.progressNote.upsert({
    where: { id: "seed_note_1" },
    update: {
      residentId: martha.id,
      activityInstanceId: instance.id,
      type: ProgressNoteType.GROUP,
      participationLevel: ParticipationLevel.HIGH,
      moodAffect: MoodAffect.BRIGHT,
      cuesRequired: CuesRequired.VERBAL,
      response: ResponseType.POSITIVE,
      followUp: "Encourage Music Social tomorrow",
      narrative: "Resident attended Bingo and was highly engaged with peers. Required occasional verbal cueing and displayed positive affect throughout session.",
      createdByUserId: admin.id
    },
    create: {
      id: "seed_note_1",
      residentId: martha.id,
      activityInstanceId: instance.id,
      type: ProgressNoteType.GROUP,
      participationLevel: ParticipationLevel.HIGH,
      moodAffect: MoodAffect.BRIGHT,
      cuesRequired: CuesRequired.VERBAL,
      response: ResponseType.POSITIVE,
      followUp: "Encourage Music Social tomorrow",
      narrative: "Resident attended Bingo and was highly engaged with peers. Required occasional verbal cueing and displayed positive affect throughout session.",
      createdByUserId: admin.id
    }
  });

  await prisma.goalLink.upsert({
    where: { id: "seed_goal_link_1" },
    update: {
      goalId: goal.id,
      attendanceId: attendance.id,
      noteId: note.id
    },
    create: {
      id: "seed_goal_link_1",
      goalId: goal.id,
      attendanceId: attendance.id,
      noteId: note.id
    }
  });

  const activitiesCarePlan = await prisma.activitiesCarePlan.upsert({
    where: { residentId: martha.id },
    update: {
      status: "ACTIVE",
      initiatedAt: addDays(today, -30),
      nextReviewAt: addDays(today, 14)
    },
    create: {
      residentId: martha.id,
      status: "ACTIVE",
      initiatedAt: addDays(today, -30),
      nextReviewAt: addDays(today, 14)
    }
  });

  const activitiesFocus = await prisma.activitiesCarePlanFocus.upsert({
    where: { id: "seed_activities_focus_1" },
    update: {
      carePlanId: activitiesCarePlan.id,
      residentId: martha.id,
      title: "Increase meaningful group engagement",
      category: "SOCIALIZATION",
      etiologyFactors: ["Low confidence in larger groups", "Afternoon fatigue"],
      baselineNarrative:
        "Resident attends intermittently and benefits from staff cueing and peer encouragement to initiate participation.",
      strengths: "Responds well to familiar music and small-group table activities.",
      preferences: "Prefers afternoon programs and seated options near friends.",
      barriersNotes: "May refuse when tired or when not informed early.",
      initiatedAt: addDays(today, -30),
      nextReviewAt: addDays(today, 14),
      status: "ACTIVE",
      statusReason: null,
      updatedByUserId: admin.id
    },
    create: {
      id: "seed_activities_focus_1",
      carePlanId: activitiesCarePlan.id,
      residentId: martha.id,
      title: "Increase meaningful group engagement",
      category: "SOCIALIZATION",
      etiologyFactors: ["Low confidence in larger groups", "Afternoon fatigue"],
      baselineNarrative:
        "Resident attends intermittently and benefits from staff cueing and peer encouragement to initiate participation.",
      strengths: "Responds well to familiar music and small-group table activities.",
      preferences: "Prefers afternoon programs and seated options near friends.",
      barriersNotes: "May refuse when tired or when not informed early.",
      initiatedAt: addDays(today, -30),
      nextReviewAt: addDays(today, 14),
      status: "ACTIVE",
      createdByUserId: admin.id,
      updatedByUserId: admin.id
    }
  });

  const activitiesGoal = await prisma.activitiesCarePlanGoal.upsert({
    where: { id: "seed_activities_goal_1" },
    update: {
      focusId: activitiesFocus.id,
      residentId: martha.id,
      type: "SOCIALIZATION",
      statement: "Resident will actively participate in at least 8 scheduled activities each month.",
      measurementMethod: "ATTENDANCE_COUNT",
      targetValue: 8,
      targetUnit: "PER_MONTH",
      startAt: addDays(today, -30),
      targetAt: addDays(today, 30),
      reviewFrequencyDays: 30,
      residentParticipated: true,
      notes: "Resident agreed with plan during one-to-one review.",
      status: "ACTIVE",
      statusReason: null,
      updatedByUserId: admin.id
    },
    create: {
      id: "seed_activities_goal_1",
      focusId: activitiesFocus.id,
      residentId: martha.id,
      type: "SOCIALIZATION",
      statement: "Resident will actively participate in at least 8 scheduled activities each month.",
      measurementMethod: "ATTENDANCE_COUNT",
      targetValue: 8,
      targetUnit: "PER_MONTH",
      startAt: addDays(today, -30),
      targetAt: addDays(today, 30),
      reviewFrequencyDays: 30,
      residentParticipated: true,
      notes: "Resident agreed with plan during one-to-one review.",
      status: "ACTIVE",
      createdByUserId: admin.id,
      updatedByUserId: admin.id
    }
  });

  const activitiesIntervention = await prisma.activitiesCarePlanIntervention.upsert({
    where: { id: "seed_activities_intervention_1" },
    update: {
      focusId: activitiesFocus.id,
      residentId: martha.id,
      goalId: activitiesGoal.id,
      title: "Early invite with preferred seating",
      personalizedApproach:
        "Provide same-day reminder 30 minutes before activity and seat resident near preferred peers to improve initiation and sustained participation.",
      frequencyType: "WEEKLY",
      frequencyValue: 4,
      responsibleRole: "AD",
      notificationMethod: "VERBAL",
      transportRequired: false,
      transportDetails: null,
      bedBoundEnabled: false,
      bedBoundText: null,
      dementiaFriendlyEnabled: true,
      dementiaFriendlyText: "Offer one-step cues and visual orientation at activity start.",
      lowVisionHearingEnabled: true,
      lowVisionHearingText: "Use large-print handouts and seat near facilitator for clear audio cues.",
      oneToOneMiniEnabled: true,
      oneToOneMiniText: "Offer 10-minute one-to-one version on non-group days.",
      suppliesNeeded: "Attendance sheet, large-print prompts, cue card",
      isActive: true,
      status: "ACTIVE",
      statusReason: null,
      updatedByUserId: admin.id
    },
    create: {
      id: "seed_activities_intervention_1",
      focusId: activitiesFocus.id,
      residentId: martha.id,
      goalId: activitiesGoal.id,
      title: "Early invite with preferred seating",
      personalizedApproach:
        "Provide same-day reminder 30 minutes before activity and seat resident near preferred peers to improve initiation and sustained participation.",
      frequencyType: "WEEKLY",
      frequencyValue: 4,
      responsibleRole: "AD",
      notificationMethod: "VERBAL",
      transportRequired: false,
      dementiaFriendlyEnabled: true,
      dementiaFriendlyText: "Offer one-step cues and visual orientation at activity start.",
      lowVisionHearingEnabled: true,
      lowVisionHearingText: "Use large-print handouts and seat near facilitator for clear audio cues.",
      oneToOneMiniEnabled: true,
      oneToOneMiniText: "Offer 10-minute one-to-one version on non-group days.",
      suppliesNeeded: "Attendance sheet, large-print prompts, cue card",
      isActive: true,
      status: "ACTIVE",
      createdByUserId: admin.id,
      updatedByUserId: admin.id
    }
  });

  await prisma.activitiesCarePlanTask.upsert({
    where: { id: "seed_activities_task_1" },
    update: {
      interventionId: activitiesIntervention.id,
      name: "Provide verbal reminder before afternoon group",
      assignedRole: "ASSISTANT",
      scheduleType: "PER_ACTIVITY_INSTANCE",
      dueDate: null,
      dueTime: null,
      daysOfWeek: Prisma.JsonNull,
      active: true,
      completionRequiresNote: true,
      updatedByUserId: admin.id
    },
    create: {
      id: "seed_activities_task_1",
      interventionId: activitiesIntervention.id,
      name: "Provide verbal reminder before afternoon group",
      assignedRole: "ASSISTANT",
      scheduleType: "PER_ACTIVITY_INSTANCE",
      active: true,
      completionRequiresNote: true,
      createdByUserId: admin.id,
      updatedByUserId: admin.id
    }
  });

  await prisma.activitiesCarePlanEvidenceLink.upsert({
    where: { id: "seed_activities_evidence_1" },
    update: {
      residentId: martha.id,
      evidenceType: "ATTENDANCE",
      attendanceId: attendance.id,
      progressNoteId: null,
      focusId: activitiesFocus.id,
      goalId: activitiesGoal.id,
      linkNote: "Attendance supports socialization goal progress.",
      linkedByUserId: admin.id
    },
    create: {
      id: "seed_activities_evidence_1",
      residentId: martha.id,
      evidenceType: "ATTENDANCE",
      attendanceId: attendance.id,
      progressNoteId: null,
      focusId: activitiesFocus.id,
      goalId: activitiesGoal.id,
      linkNote: "Attendance supports socialization goal progress.",
      linkedByUserId: admin.id
    }
  });

  await prisma.activitiesCarePlanEvidenceLink.upsert({
    where: { id: "seed_activities_evidence_2" },
    update: {
      residentId: martha.id,
      evidenceType: "PROGRESS_NOTE",
      attendanceId: null,
      progressNoteId: note.id,
      focusId: activitiesFocus.id,
      goalId: activitiesGoal.id,
      linkNote: "Narrative note confirms active peer engagement.",
      linkedByUserId: admin.id
    },
    create: {
      id: "seed_activities_evidence_2",
      residentId: martha.id,
      evidenceType: "PROGRESS_NOTE",
      attendanceId: null,
      progressNoteId: note.id,
      focusId: activitiesFocus.id,
      goalId: activitiesGoal.id,
      linkNote: "Narrative note confirms active peer engagement.",
      linkedByUserId: admin.id
    }
  });

  await prisma.activitiesCarePlanReview.upsert({
    where: { id: "seed_activities_review_1" },
    update: {
      carePlanId: activitiesCarePlan.id,
      residentId: martha.id,
      startedAt: addDays(today, -7),
      targetCompletionAt: addDays(today, 7),
      completionAt: null,
      status: "OPEN",
      summary: "Continue current interventions and reassess participation trend at next review.",
      createdByUserId: admin.id
    },
    create: {
      id: "seed_activities_review_1",
      carePlanId: activitiesCarePlan.id,
      residentId: martha.id,
      startedAt: addDays(today, -7),
      targetCompletionAt: addDays(today, 7),
      status: "OPEN",
      summary: "Continue current interventions and reassess participation trend at next review.",
      createdByUserId: admin.id
    }
  });

  await prisma.interestAssessment.upsert({
    where: { id: "seed_assessment_1" },
    update: {
      residentId: martha.id,
      answers: {
        music: "Country music",
        topics: "Family stories",
        faith: "Sunday prayer",
        hobbies: "Cards and singing",
        bestTimeOfDay: "Afternoon"
      },
      dislikesTriggers: "Loud sudden noises",
      suggestedPrograms: ["Music social hour", "Name that tune", "Spiritual reflection circle"]
    },
    create: {
      id: "seed_assessment_1",
      residentId: martha.id,
      answers: {
        music: "Country music",
        topics: "Family stories",
        faith: "Sunday prayer",
        hobbies: "Cards and singing",
        bestTimeOfDay: "Afternoon"
      },
      dislikesTriggers: "Loud sudden noises",
      suggestedPrograms: ["Music social hour", "Name that tune", "Spiritual reflection circle"]
    }
  });

  await prisma.inventoryItem.upsert({
    where: { id: "seed_inventory_1" },
    update: {
      facilityId: facility.id,
      name: "Bingo markers",
      category: "Games",
      onHand: 14,
      reorderAt: 20,
      unitLabel: "packs"
    },
    create: {
      id: "seed_inventory_1",
      facilityId: facility.id,
      name: "Bingo markers",
      category: "Games",
      onHand: 14,
      reorderAt: 20,
      unitLabel: "packs"
    }
  });

  await prisma.prizeItem.upsert({
    where: { id: "seed_prize_1" },
    update: {
      facilityId: facility.id,
      name: "Puzzle book",
      priceCents: 200,
      onHand: 6,
      reorderAt: 10
    },
    create: {
      id: "seed_prize_1",
      facilityId: facility.id,
      name: "Puzzle book",
      priceCents: 200,
      onHand: 6,
      reorderAt: 10
    }
  });

  await prisma.residentCouncilMeeting.upsert({
    where: { id: "seed_council_meeting_1" },
    update: {
      facilityId: facility.id,
      heldAt: addDays(today, -7),
      attendanceCount: 12,
      notes: "Discussed weekend music program request"
    },
    create: {
      id: "seed_council_meeting_1",
      facilityId: facility.id,
      heldAt: addDays(today, -7),
      attendanceCount: 12,
      notes: "Discussed weekend music program request"
    }
  });

  await prisma.residentCouncilItem.upsert({
    where: { id: "seed_council_item_1" },
    update: {
      meetingId: "seed_council_meeting_1",
      category: "Programming",
      concern: "Need more country music events",
      followUp: "Add weekly music social",
      status: "UNRESOLVED",
      owner: "Activities Director"
    },
    create: {
      id: "seed_council_item_1",
      meetingId: "seed_council_meeting_1",
      category: "Programming",
      concern: "Need more country music events",
      followUp: "Add weekly music social",
      status: "UNRESOLVED",
      owner: "Activities Director"
    }
  });

  await prisma.volunteer.upsert({
    where: { id: "seed_volunteer_1" },
    update: {
      facilityId: facility.id,
      name: "Olivia Chen",
      phone: "555-0134",
      requirements: ["Background check", "Orientation complete"]
    },
    create: {
      id: "seed_volunteer_1",
      facilityId: facility.id,
      name: "Olivia Chen",
      phone: "555-0134",
      requirements: ["Background check", "Orientation complete"]
    }
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
