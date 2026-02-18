export type PlanAreaKey =
  | "LEISURE_ENGAGEMENT"
  | "SOCIALIZATION"
  | "COGNITIVE_STIMULATION"
  | "MOOD_WELLBEING"
  | "PHYSICAL_ENGAGEMENT"
  | "COMMUNICATION_SUPPORT"
  | "SENSORY_STIMULATION"
  | "BEHAVIORAL_SUPPORT"
  | "SPIRITUAL_CULTURAL"
  | "COMMUNITY_INTEGRATION";

export type TargetFrequencyKey = "DAILY" | "TWO_TO_THREE_WEEK" | "WEEKLY" | "MONTHLY" | "PRN";
export type CueingLevelKey = "NONE" | "VERBAL" | "VISUAL" | "TACTILE_HAND_OVER_HAND" | "ENVIRONMENTAL";
export type GroupPreferenceKey = "GROUP" | "ONE_TO_ONE" | "INDEPENDENT" | "MIXED";

export type PlanAreaDefinition = {
  key: PlanAreaKey;
  label: string;
};

export type PlanGoalTemplate = {
  id: string;
  title: string;
  goalText: string;
  suggestedFrequency: TargetFrequencyKey;
  suggestedGroupPreference: GroupPreferenceKey;
};

export type PlanInterventionOption = {
  key: string;
  label: string;
};

export type BarrierOption = {
  key: string;
  label: string;
};

export const planAreas: PlanAreaDefinition[] = [
  { key: "LEISURE_ENGAGEMENT", label: "Leisure Engagement / Meaningful Activity" },
  { key: "SOCIALIZATION", label: "Socialization" },
  { key: "COGNITIVE_STIMULATION", label: "Cognitive Stimulation" },
  { key: "MOOD_WELLBEING", label: "Mood / Emotional Well-Being" },
  { key: "PHYSICAL_ENGAGEMENT", label: "Physical Engagement" },
  { key: "COMMUNICATION_SUPPORT", label: "Communication Support" },
  { key: "SENSORY_STIMULATION", label: "Sensory Stimulation" },
  { key: "BEHAVIORAL_SUPPORT", label: "Behavioral Support" },
  { key: "SPIRITUAL_CULTURAL", label: "Spiritual / Cultural Support" },
  { key: "COMMUNITY_INTEGRATION", label: "Community Integration" }
];

export const targetFrequencyOptions: Array<{ key: TargetFrequencyKey; label: string }> = [
  { key: "DAILY", label: "Daily" },
  { key: "TWO_TO_THREE_WEEK", label: "2-3x/week" },
  { key: "WEEKLY", label: "Weekly" },
  { key: "MONTHLY", label: "Monthly" },
  { key: "PRN", label: "PRN" }
];

export const cueingLevelOptions: Array<{ key: CueingLevelKey; label: string }> = [
  { key: "NONE", label: "None" },
  { key: "VERBAL", label: "Verbal" },
  { key: "VISUAL", label: "Visual" },
  { key: "TACTILE_HAND_OVER_HAND", label: "Tactile/Hand-over-hand" },
  { key: "ENVIRONMENTAL", label: "Environmental" }
];

export const groupPreferenceOptions: Array<{ key: GroupPreferenceKey; label: string }> = [
  { key: "GROUP", label: "Group" },
  { key: "ONE_TO_ONE", label: "1:1" },
  { key: "INDEPENDENT", label: "Independent" },
  { key: "MIXED", label: "Mixed" }
];

export const goalTemplates: Record<PlanAreaKey, PlanGoalTemplate[]> = {
  LEISURE_ENGAGEMENT: [
    {
      id: "LEISURE_ENGAGEMENT_increase_meaningful_participation",
      title: "Increase meaningful participation",
      goalText: "{resident} will participate in preferred meaningful activities to support quality of life {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "LEISURE_ENGAGEMENT_rebuild_routine",
      title: "Rebuild routine",
      goalText: "{resident} will engage in a consistent leisure routine during {time_of_day} {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "LEISURE_ENGAGEMENT_choice_based_engagement",
      title: "Choice-based engagement",
      goalText: "{resident} will be offered activity choices and will select a preferred option {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "LEISURE_ENGAGEMENT_independent_leisure",
      title: "Independent leisure",
      goalText: "{resident} will complete an independent leisure activity with {cueing} cues as needed {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "INDEPENDENT"
    },
    {
      id: "LEISURE_ENGAGEMENT_interest_exploration",
      title: "Interest exploration",
      goalText: "{resident} will explore new leisure options to identify at least 1 preferred activity per month.",
      suggestedFrequency: "MONTHLY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "LEISURE_ENGAGEMENT_one_to_one_engagement",
      title: "1:1 engagement",
      goalText: "{resident} will engage in a 1:1 leisure session to promote interest and comfort {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "LEISURE_ENGAGEMENT_low_motivation_support",
      title: "Low motivation support",
      goalText: "{resident} will participate in a low-demand activity session to improve engagement {suggested_frequency}.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    }
  ],
  SOCIALIZATION: [
    {
      id: "SOCIALIZATION_increase_peer_interaction",
      title: "Increase peer interaction",
      goalText: "{resident} will participate in social opportunities to increase positive peer interaction {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "SOCIALIZATION_reduce_isolation",
      title: "Reduce isolation",
      goalText: "{resident} will attend a small-group activity to reduce isolation {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "SOCIALIZATION_conversation_goal",
      title: "Conversation goal",
      goalText: "{resident} will engage in conversation with staff/peers for at least 5–10 minutes {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "SOCIALIZATION_community_dining_social",
      title: "Community dining/social",
      goalText: "{resident} will participate in a communal social setting to promote connection {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "SOCIALIZATION_resident_council_participation",
      title: "Resident council participation",
      goalText: "{resident} will participate in resident council or feedback opportunities monthly as tolerated.",
      suggestedFrequency: "MONTHLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "SOCIALIZATION_supportive_introductions",
      title: "Supportive introductions",
      goalText: "{resident} will be introduced to peers with shared interests to support social comfort weekly.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "SOCIALIZATION_one_to_one_social_visits",
      title: "1:1 social visits",
      goalText: "{resident} will engage in 1:1 social visits for support and rapport {suggested_frequency}.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    }
  ],
  COGNITIVE_STIMULATION: [
    {
      id: "COGNITIVE_STIMULATION_maintain_cognitive_engagement",
      title: "Maintain cognitive engagement",
      goalText: "{resident} will participate in cognitively stimulating activities to support attention and recall {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "COGNITIVE_STIMULATION_orientation_support",
      title: "Orientation support",
      goalText: "{resident} will engage in orientation-based programming (date/time/topic) {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "COGNITIVE_STIMULATION_word_number_games",
      title: "Word/number games",
      goalText: "{resident} will participate in structured cognitive games with {cueing} cues {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "COGNITIVE_STIMULATION_reminiscence",
      title: "Reminiscence",
      goalText: "{resident} will engage in reminiscence-based sessions to support memory and identity weekly.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "COGNITIVE_STIMULATION_problem_solving",
      title: "Problem-solving",
      goalText: "{resident} will participate in simple problem-solving activities {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "COGNITIVE_STIMULATION_dementia_friendly_cognition",
      title: "Dementia-friendly cognition",
      goalText: "{resident} will engage in dementia-appropriate cognitive stimulation with simplified steps {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "COGNITIVE_STIMULATION_attention_building",
      title: "Attention-building",
      goalText: "{resident} will attend a short-duration cognitive activity (10–15 min) {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "MIXED"
    }
  ],
  MOOD_WELLBEING: [
    {
      id: "MOOD_WELLBEING_support_positive_mood",
      title: "Support positive mood",
      goalText: "{resident} will participate in preferred activities to support positive mood and reduce stress {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "MOOD_WELLBEING_coping_skills",
      title: "Coping skills",
      goalText: "{resident} will use calming activities (music, sensory, guided conversation) during distress {suggested_frequency} or PRN.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "MOOD_WELLBEING_increase_sense_of_purpose",
      title: "Increase sense of purpose",
      goalText: "{resident} will participate in purposeful roles (helper tasks, resident-led moments) weekly as tolerated.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "MOOD_WELLBEING_reduce_anxiety",
      title: "Reduce anxiety",
      goalText: "{resident} will engage in calming programming to reduce anxiety symptoms {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "MOOD_WELLBEING_emotional_expression",
      title: "Emotional expression",
      goalText: "{resident} will participate in expressive activities (art, music, journaling) weekly as tolerated.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "MOOD_WELLBEING_grief_loss_support",
      title: "Grief/loss support",
      goalText: "{resident} will receive supportive 1:1 visits to process grief/loss weekly or PRN.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "MOOD_WELLBEING_motivation_building",
      title: "Motivation building",
      goalText: "{resident} will participate in a short, low-pressure activity to increase motivation {suggested_frequency}.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    }
  ],
  PHYSICAL_ENGAGEMENT: [
    {
      id: "PHYSICAL_ENGAGEMENT_group_movement",
      title: "Group movement",
      goalText: "{resident} will participate in movement-based activities to support strength and endurance {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "PHYSICAL_ENGAGEMENT_chair_based_activity",
      title: "Chair-based activity",
      goalText: "{resident} will participate in chair-based exercises or active games {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "PHYSICAL_ENGAGEMENT_fine_motor_support",
      title: "Fine motor support",
      goalText: "{resident} will engage in fine-motor activities (crafts, sorting, cards) {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "PHYSICAL_ENGAGEMENT_walking_social_stroll",
      title: "Walking/social stroll",
      goalText: "{resident} will participate in supervised walking or facility strolls weekly as tolerated.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "PHYSICAL_ENGAGEMENT_therapy_carryover",
      title: "Therapy carryover",
      goalText: "{resident} will participate in activities supporting therapy goals with {cueing} cues {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "PHYSICAL_ENGAGEMENT_range_of_motion_friendly",
      title: "Range-of-motion friendly",
      goalText: "{resident} will engage in gentle ROM-friendly activities {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "MIXED"
    }
  ],
  COMMUNICATION_SUPPORT: [
    {
      id: "COMMUNICATION_SUPPORT_hearing_support",
      title: "Hearing support",
      goalText: "{resident} will participate with communication accommodations (volume, placement, repetition) {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "COMMUNICATION_SUPPORT_nonverbal_participation",
      title: "Nonverbal participation",
      goalText: "{resident} will be offered nonverbal participation options (yes/no, pointing, visual choice) {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "COMMUNICATION_SUPPORT_aphasia_support",
      title: "Aphasia support",
      goalText: "{resident} will engage in communication-friendly activities with simplified prompts {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "COMMUNICATION_SUPPORT_cueing_support",
      title: "Cueing support",
      goalText: "{resident} will participate with {cueing} cueing to support understanding and engagement {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "COMMUNICATION_SUPPORT_assistive_devices",
      title: "Assistive devices",
      goalText: "{resident} will use adaptive communication supports (boards, gestures) during activities {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "COMMUNICATION_SUPPORT_small_group_communication",
      title: "Small group communication",
      goalText: "{resident} will attend small-group activities to support comfortable communication weekly.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    }
  ],
  SENSORY_STIMULATION: [
    {
      id: "SENSORY_STIMULATION_calming_sensory",
      title: "Calming sensory",
      goalText: "{resident} will engage in calming sensory-based programming to support regulation {suggested_frequency} or PRN.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "SENSORY_STIMULATION_music_engagement",
      title: "Music engagement",
      goalText: "{resident} will participate in music-based sessions for stimulation and comfort {suggested_frequency}.",
      suggestedFrequency: "TWO_TO_THREE_WEEK",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "SENSORY_STIMULATION_low_vision_support",
      title: "Low-vision support",
      goalText: "{resident} will participate with low-vision adaptations (high contrast, tactile items) {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "SENSORY_STIMULATION_tactile_engagement",
      title: "Tactile engagement",
      goalText: "{resident} will engage in tactile activities (fidgets, textured items) {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "SENSORY_STIMULATION_aromatherapy_options",
      title: "Aromatherapy options",
      goalText: "{resident} will engage in safe scent-based relaxation options PRN as tolerated.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "SENSORY_STIMULATION_preference_discovery",
      title: "Sensory preference discovery",
      goalText: "{resident} will trial sensory options to identify preferred sensory supports monthly.",
      suggestedFrequency: "MONTHLY",
      suggestedGroupPreference: "ONE_TO_ONE"
    }
  ],
  BEHAVIORAL_SUPPORT: [
    {
      id: "BEHAVIORAL_SUPPORT_structure_and_routine",
      title: "Structure and routine",
      goalText: "{resident} will engage in structured activities to support routine and reduce behavioral distress {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "BEHAVIORAL_SUPPORT_redirection_plan",
      title: "Redirection plan",
      goalText: "{resident} will be offered redirection activities during agitation/wandering PRN.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "BEHAVIORAL_SUPPORT_trigger_reduction",
      title: "Trigger reduction",
      goalText: "{resident} will engage in preferred calming activities when triggers are identified PRN.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "BEHAVIORAL_SUPPORT_one_to_one_deescalation",
      title: "1:1 de-escalation",
      goalText: "{resident} will receive 1:1 supportive visits to reduce escalation {suggested_frequency} or PRN.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "BEHAVIORAL_SUPPORT_safe_engagement",
      title: "Safe engagement",
      goalText: "{resident} will participate in low-stimulation programming to support safe engagement {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "BEHAVIORAL_SUPPORT_behavior_replacement",
      title: "Behavior replacement",
      goalText: "{resident} will be offered replacement activities to reduce negative behaviors {suggested_frequency}.",
      suggestedFrequency: "DAILY",
      suggestedGroupPreference: "MIXED"
    }
  ],
  SPIRITUAL_CULTURAL: [
    {
      id: "SPIRITUAL_CULTURAL_faith_participation",
      title: "Faith participation",
      goalText: "{resident} will be offered faith-based programming/services weekly as desired.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "SPIRITUAL_CULTURAL_cultural_connection",
      title: "Cultural connection",
      goalText: "{resident} will participate in culturally meaningful activities/music/holidays monthly as desired.",
      suggestedFrequency: "MONTHLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "SPIRITUAL_CULTURAL_personal_devotion",
      title: "Personal devotion",
      goalText: "{resident} will have access to devotional materials/reading {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "INDEPENDENT"
    },
    {
      id: "SPIRITUAL_CULTURAL_prayer_support_visits",
      title: "Prayer/support visits",
      goalText: "{resident} will receive spiritual support visits PRN or weekly as requested.",
      suggestedFrequency: "PRN",
      suggestedGroupPreference: "ONE_TO_ONE"
    },
    {
      id: "SPIRITUAL_CULTURAL_music_traditions",
      title: "Music traditions",
      goalText: "{resident} will engage in preferred cultural/spiritual music sessions {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "MIXED"
    },
    {
      id: "SPIRITUAL_CULTURAL_reflection_circle",
      title: "Reflection circle",
      goalText: "{resident} will participate in reflection-based discussions in a supportive setting {suggested_frequency}.",
      suggestedFrequency: "MONTHLY",
      suggestedGroupPreference: "GROUP"
    }
  ],
  COMMUNITY_INTEGRATION: [
    {
      id: "COMMUNITY_INTEGRATION_facility_events",
      title: "Facility events",
      goalText: "{resident} will attend facility community events/entertainment {suggested_frequency}.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "COMMUNITY_INTEGRATION_outings",
      title: "Outings",
      goalText: "{resident} will be offered community outings as available monthly/seasonally.",
      suggestedFrequency: "MONTHLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "COMMUNITY_INTEGRATION_family_involvement",
      title: "Family involvement",
      goalText: "{resident} will be encouraged to participate in family-inclusive events monthly as tolerated.",
      suggestedFrequency: "MONTHLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "COMMUNITY_INTEGRATION_resident_leadership",
      title: "Resident leadership",
      goalText: "{resident} will be offered opportunities to lead/support group activities weekly or monthly.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "COMMUNITY_INTEGRATION_volunteer_community_contact",
      title: "Volunteer/community contact",
      goalText: "{resident} will participate in volunteer/community visitor interactions weekly/monthly.",
      suggestedFrequency: "WEEKLY",
      suggestedGroupPreference: "GROUP"
    },
    {
      id: "COMMUNITY_INTEGRATION_local_connection_prompts",
      title: "Local connection prompts",
      goalText: "{resident} will engage in local community topics and shared events to strengthen belonging {suggested_frequency}.",
      suggestedFrequency: "MONTHLY",
      suggestedGroupPreference: "MIXED"
    }
  ]
};

export const interventions: Record<PlanAreaKey, PlanInterventionOption[]> = {
  LEISURE_ENGAGEMENT: [
    { key: "offer_choice_2_3", label: "Offer choice of 2-3 activities" },
    { key: "one_to_one_in_room", label: "Provide 1:1 in-room session" },
    { key: "set_up_preferred_materials", label: "Set up preferred materials before start" },
    { key: "short_sessions_then_build", label: "Use shorter sessions and build duration gradually" },
    { key: "schedule_at_best_time", label: "Schedule at preferred time of day" },
    { key: "cue_before_activity", label: "Give reminder cue before activity start" },
    { key: "adapt_for_bed_bound", label: "Adapt for bed-bound participation" },
    { key: "offer_independent_kit", label: "Offer independent leisure kit" },
    { key: "document_activity_preferences", label: "Document accepted/refused choices each session" },
    { key: "invite_peer_with_shared_interest", label: "Invite peer with shared interests" },
    { key: "use_positive_reinforcement", label: "Use positive reinforcement and praise" }
  ],
  SOCIALIZATION: [
    { key: "small_group_first", label: "Start with small-group social settings" },
    { key: "buddy_pairing", label: "Pair with peer buddy for entry support" },
    { key: "structured_conversation_prompts", label: "Use structured conversation prompts" },
    { key: "staff_facilitated_introductions", label: "Facilitate staff-led introductions" },
    { key: "seat_near_facilitator", label: "Seat near facilitator and supportive peers" },
    { key: "community_dining_invites", label: "Offer community dining invitations" },
    { key: "resident_council_prompt", label: "Prompt resident council participation" },
    { key: "one_to_one_social_warmup", label: "Use 1:1 warm-up before group entry" },
    { key: "post_activity_debrief", label: "Debrief after activity to reinforce positive moments" },
    { key: "family_social_event_invites", label: "Invite to family-inclusive social events" }
  ],
  COGNITIVE_STIMULATION: [
    { key: "use_familiar_topics", label: "Use familiar themes and topics" },
    { key: "simplify_instructions", label: "Break tasks into one-step directions" },
    { key: "word_number_games", label: "Provide word/number games" },
    { key: "orientation_board_use", label: "Use orientation prompts (date/place/time)" },
    { key: "reminiscence_cards", label: "Use reminiscence cards/photos" },
    { key: "adjust_difficulty_in_real_time", label: "Adjust activity difficulty in real time" },
    { key: "visual_supports", label: "Provide visual cue supports" },
    { key: "repeat_and_rephrase", label: "Repeat/rephrase prompts as needed" },
    { key: "short_attention_blocks", label: "Use 10-15 minute attention blocks" },
    { key: "track_response_patterns", label: "Track cognitive response patterns by activity type" }
  ],
  MOOD_WELLBEING: [
    { key: "music_for_regulation", label: "Use preferred music for mood regulation" },
    { key: "calming_sensory_options", label: "Offer calming sensory options" },
    { key: "daily_check_in", label: "Provide brief emotional check-in" },
    { key: "guided_breathing", label: "Guide simple breathing/grounding practice" },
    { key: "purposeful_role_offer", label: "Offer purposeful helper role" },
    { key: "expressive_art_option", label: "Offer expressive art/journaling option" },
    { key: "one_to_one_supportive_visit", label: "Provide 1:1 supportive visit as needed" },
    { key: "reduce_stimulus_when_distressed", label: "Reduce stimulation during distress" },
    { key: "praise_small_wins", label: "Reinforce small participation wins" },
    { key: "coordinate_with_nursing_for_mood_changes", label: "Notify team for notable mood changes" }
  ],
  PHYSICAL_ENGAGEMENT: [
    { key: "chair_exercise_adaptation", label: "Use chair-based exercise adaptations" },
    { key: "warm_up_cool_down", label: "Include gentle warm-up and cool-down" },
    { key: "supervised_walks", label: "Offer supervised stroll/walking rounds" },
    { key: "fine_motor_station", label: "Provide fine motor stations (cards/sorting/crafts)" },
    { key: "rom_friendly_tasks", label: "Use ROM-friendly movement choices" },
    { key: "rest_breaks_scheduled", label: "Schedule rest breaks between sets" },
    { key: "hydration_prompt", label: "Prompt hydration before/after activity" },
    { key: "therapy_carryover_cues", label: "Use therapy carryover cues in activity setup" },
    { key: "mobility_level_based_seating", label: "Adjust seating based on mobility level" },
    { key: "track_endurance_tolerance", label: "Track tolerance and endurance trend" }
  ],
  COMMUNICATION_SUPPORT: [
    { key: "face_to_face_positioning", label: "Position face-to-face for communication" },
    { key: "speak_slowly_and_repeat", label: "Speak slowly and repeat key prompts" },
    { key: "use_yes_no_choices", label: "Offer yes/no and forced-choice options" },
    { key: "visual_choice_board", label: "Use visual choice board/cards" },
    { key: "gesture_and_modeling", label: "Use gesture/modeling with verbal prompts" },
    { key: "reduce_background_noise", label: "Reduce background noise during instruction" },
    { key: "small_group_setting", label: "Prefer small group communication settings" },
    { key: "allow_processing_time", label: "Allow extra processing time before response" },
    { key: "confirm_understanding", label: "Confirm understanding with simple teach-back" },
    { key: "use_assistive_comm_tools", label: "Use assistive communication tools when available" }
  ],
  SENSORY_STIMULATION: [
    { key: "music_playlist_personalized", label: "Use personalized sensory music playlist" },
    { key: "tactile_fidget_items", label: "Offer tactile fidgets/textured items" },
    { key: "high_contrast_materials", label: "Use high-contrast visual materials" },
    { key: "dim_bright_adjustment", label: "Adjust lighting based on comfort" },
    { key: "calm_corner_setup", label: "Use low-stimulation calm corner when needed" },
    { key: "aroma_option_if_approved", label: "Offer safe aroma option per policy" },
    { key: "sensory_break_schedule", label: "Schedule brief sensory breaks" },
    { key: "one_to_one_sensory_time", label: "Provide 1:1 sensory regulation session" },
    { key: "track_sensory_preferences", label: "Document preferred sensory inputs" },
    { key: "avoid_known_sensory_triggers", label: "Avoid identified sensory triggers" }
  ],
  BEHAVIORAL_SUPPORT: [
    { key: "predictable_daily_routine", label: "Maintain predictable daily routine cues" },
    { key: "early_redirection", label: "Use early redirection to preferred activity" },
    { key: "low_stimulation_environment", label: "Offer low-stimulation setting during escalation risk" },
    { key: "one_to_one_deescalation_visit", label: "Provide 1:1 de-escalation support" },
    { key: "trigger_log_review", label: "Review trigger log before activity engagement" },
    { key: "replacement_activity_menu", label: "Offer replacement activity menu" },
    { key: "short_frequent_checkins", label: "Use short frequent behavior support check-ins" },
    { key: "calming_toolkit_access", label: "Provide calming toolkit access" },
    { key: "staff_consistency_script", label: "Use consistent staff language/script" },
    { key: "communicate_behavior_changes", label: "Communicate behavior changes to care team" }
  ],
  SPIRITUAL_CULTURAL: [
    { key: "offer_faith_service", label: "Offer participation in faith service/devotion" },
    { key: "spiritual_music_playlist", label: "Use preferred spiritual/cultural music" },
    { key: "devotional_material_access", label: "Provide devotional reading/materials" },
    { key: "prayer_or_reflection_visit", label: "Provide prayer/reflection visit as requested" },
    { key: "cultural_holiday_programming", label: "Include resident in cultural holiday activities" },
    { key: "respect_belief_preferences", label: "Respect and document personal beliefs/preferences" },
    { key: "family_spiritual_link", label: "Coordinate family-supported spiritual connections" },
    { key: "small_group_reflection", label: "Offer small-group reflection option" },
    { key: "quiet_space_option", label: "Provide quiet space option for reflection" },
    { key: "track_spiritual_engagement", label: "Track spiritual/cultural engagement tolerance" }
  ],
  COMMUNITY_INTEGRATION: [
    { key: "invite_facility_events", label: "Invite resident to facility events" },
    { key: "community_outing_offer", label: "Offer supervised outing opportunities" },
    { key: "family_inclusive_event_invite", label: "Invite to family-inclusive events" },
    { key: "resident_leadership_role", label: "Offer resident leadership/helper role" },
    { key: "volunteer_visit_match", label: "Match with volunteer/community visitors" },
    { key: "event_reminder_cues", label: "Provide reminder cues before events" },
    { key: "transport_coordination", label: "Coordinate transport/mobility support" },
    { key: "post_event_reflection", label: "Discuss event experience after participation" },
    { key: "interest_based_event_matching", label: "Match events to resident interests" },
    { key: "track_community_attendance", label: "Track community engagement attendance trend" }
  ]
};

export const barriers: BarrierOption[] = [
  { key: "low_motivation", label: "Low motivation" },
  { key: "fatigue", label: "Fatigue" },
  { key: "pain", label: "Pain" },
  { key: "anxiety", label: "Anxiety" },
  { key: "depression_flat_affect", label: "Depression/flat affect" },
  { key: "dementia_cognitive_impairment", label: "Dementia/cognitive impairment" },
  { key: "hearing_impairment", label: "Hearing impairment" },
  { key: "vision_impairment", label: "Vision impairment" },
  { key: "aphasia_communication_deficit", label: "Aphasia/communication deficit" },
  { key: "behavioral_symptoms", label: "Behavioral symptoms" },
  { key: "limited_mobility_bed_bound", label: "Limited mobility/bed-bound" },
  { key: "dialysis_therapy_schedule_conflict", label: "Dialysis/therapy schedule conflict" },
  { key: "prefers_one_to_one", label: "Prefers 1:1" },
  { key: "prefers_independent", label: "Prefers independent" },
  { key: "isolation_withdrawal", label: "Isolation/withdrawal" }
];

const frequencyLabelMap = new Map(targetFrequencyOptions.map((option) => [option.key, option.label]));
const cueingLabelMap = new Map(cueingLevelOptions.map((option) => [option.key, option.label]));
const groupLabelMap = new Map(groupPreferenceOptions.map((option) => [option.key, option.label]));
const planAreaLabelMap = new Map(planAreas.map((area) => [area.key, area.label]));

export function getPlanAreaLabel(planAreaKey: PlanAreaKey) {
  return planAreaLabelMap.get(planAreaKey) ?? planAreaKey;
}

export function getFrequencyLabel(key: TargetFrequencyKey) {
  return frequencyLabelMap.get(key) ?? key;
}

export function getCueingLabel(key: CueingLevelKey) {
  return cueingLabelMap.get(key) ?? key;
}

export function getGroupPreferenceLabel(key: GroupPreferenceKey) {
  return groupLabelMap.get(key) ?? key;
}

export function getGoalTemplate(planAreaKey: PlanAreaKey, templateId: string | null | undefined) {
  if (!templateId) return null;
  return goalTemplates[planAreaKey].find((template) => template.id === templateId) ?? null;
}

export function resolveGoalText(params: {
  residentName: string;
  planAreaKey: PlanAreaKey;
  templateId: string | null | undefined;
  customGoalText: string | null | undefined;
  targetFrequency: TargetFrequencyKey;
  cueingLevel: CueingLevelKey;
  preferredActivity?: string;
  timeOfDay?: string;
  setting?: string;
}) {
  const customGoalText = params.customGoalText?.trim();
  if (customGoalText) return customGoalText;

  const template = getGoalTemplate(params.planAreaKey, params.templateId);
  if (!template) return "Goal not set.";

  const replacements: Record<string, string> = {
    "{resident}": params.residentName,
    "{preferred_activity}": params.preferredActivity ?? "preferred activity",
    "{time_of_day}": params.timeOfDay ?? "preferred time of day",
    "{cueing}": getCueingLabel(params.cueingLevel).toLowerCase(),
    "{setting}": params.setting ?? "preferred setting",
    "{suggested_frequency}": getFrequencyLabel(params.targetFrequency)
  };

  return Object.entries(replacements).reduce(
    (result, [placeholder, value]) => result.split(placeholder).join(value),
    template.goalText
  );
}
