export type AssistantIntent =
  | "backupActivityIdeas"
  | "groupActivityIdeas"
  | "oneToOneVisitIdeas"
  | "bedBoundResidentIdeas"
  | "dementiaFriendlyIdeas"
  | "progressNoteHelp"
  | "oneToOneNoteHelp"
  | "carePlanWording"
  | "calendarPlanningHelp"
  | "holidayActivityPlanning"
  | "residentEngagementSuggestions"
  | "lowBudgetActivityIdeas"
  | "fallback";

export type PresetAssistantResponse = {
  id: string;
  title: string;
  content: string;
  tags: string[];
};

export const PRESET_RESPONSES: Record<AssistantIntent, PresetAssistantResponse[]> = {
  backupActivityIdeas: [
    {
      id: "backup-1",
      title: "10-Minute No-Prep Circle Reset",
      content:
        "Use this quick reset when a planned group falls through:\n- 2 min: seated stretch and deep breathing\n- 4 min: finish-the-lyric with familiar songs\n- 3 min: would-you-rather questions\n- 1 min: close with gratitude share\n\nSupplies: none. Works well for mixed ability groups.",
      tags: ["last-minute", "no prep", "mixed ability"]
    },
    {
      id: "backup-2",
      title: "Grab-and-Go Trivia Stack",
      content:
        "Keep a laminated trivia stack at the desk for instant use.\n- Pick one topic: music, TV, holidays, or hometown memories\n- Ask 8-10 short questions\n- Add one bonus memory question to spark conversation\n\nIf energy is low, let residents answer as a team instead of individually.",
      tags: ["backup", "trivia", "conversation"]
    },
    {
      id: "backup-3",
      title: "Picture Prompt Discussion",
      content:
        "Show 5 printed photos (nature, food, classic cars, pets, travel).\n- Ask: “What does this remind you of?”\n- Ask follow-up: “Who would you share this with?”\n- End with a simple vote for favorite photo\n\nGreat for residents who engage better with visual cues than long instructions.",
      tags: ["visual", "memory", "low-energy"]
    },
    {
      id: "backup-4",
      title: "Tabletop Balloon Tap",
      content:
        "Use a balloon and seated semicircle.\n- Goal: keep balloon moving without standing\n- Add themes: name a favorite dessert before each tap\n- Keep rounds short (60-90 seconds)\n\nUse a lightweight beach ball if balloons are not allowed.",
      tags: ["movement", "seated", "quick setup"]
    },
    {
      id: "backup-5",
      title: "Mini Bingo Sprint",
      content:
        "Run a shortened 15-minute bingo burst.\n- Use 10 calls only\n- Offer simple recognition (sticker, applause, first snack pick)\n- Keep pace upbeat and social\n\nThis works well when transportation delays shorten your group window.",
      tags: ["bingo", "15 minutes", "high familiarity"]
    }
  ],
  groupActivityIdeas: [
    {
      id: "group-1",
      title: "Low-Energy Music Match",
      content:
        "Run a calm music group with easy participation.\n- Play 20-30 second clips of familiar songs\n- Residents guess artist, decade, or mood\n- Add optional sing-along chorus rounds\n\nClose with “song of the day” vote for tomorrow’s opener.",
      tags: ["group", "music", "low-energy"]
    },
    {
      id: "group-2",
      title: "Seated Story Circle",
      content:
        "Use simple prompts to encourage conversation.\n- Prompt examples: first job, favorite summer food, school memories\n- Keep each response to 30-60 seconds\n- Offer cue cards for residents who need support\n\nIdeal when you want social connection without physical demand.",
      tags: ["social", "conversation", "seated"]
    },
    {
      id: "group-3",
      title: "Team Word Puzzle Relay",
      content:
        "Create two teams and run friendly word rounds.\n- Unscramble one word at a time\n- Use topics residents know (holidays, food, music)\n- Rotate helpers so quieter residents still participate\n\nThis format balances cognitive challenge with teamwork.",
      tags: ["cognitive", "team", "light challenge"]
    },
    {
      id: "group-4",
      title: "Hands-On Craft Social",
      content:
        "Do one simple craft while maintaining conversation.\n- Example: bookmark decorating or card-making\n- Offer pre-cut supplies and bold markers\n- Pair residents who like social crafting together\n\nUse music in the background to keep the room relaxed.",
      tags: ["craft", "social", "adaptable"]
    },
    {
      id: "group-5",
      title: "Game Show Afternoon",
      content:
        "Host a quick game-show style session.\n- 3 rounds: trivia, name-that-tune, and category challenge\n- Use large-print score cards\n- Celebrate every team with recognition\n\nStrong option for mixed cognition when prompts are short and visual.",
      tags: ["group game", "engagement", "fun"]
    }
  ],
  oneToOneVisitIdeas: [
    {
      id: "oneone-1",
      title: "Personal Interest Visit (12-15 min)",
      content:
        "Use this 1:1 structure:\n- 3 min check-in and mood scan\n- 6 min activity based on known interest (music, cards, photos)\n- 3 min reflection and next-visit preference\n\nDocument one clear response phrase from the resident if possible.",
      tags: ["1:1", "relationship-building", "structured"]
    },
    {
      id: "oneone-2",
      title: "Conversation + Puzzle Combo",
      content:
        "Bring a large-piece puzzle or word search.\n- Begin with 1 personal question\n- Work puzzle for 8-10 minutes\n- End by asking what time of day feels best for next visit\n\nThis supports residents who prefer quiet, side-by-side engagement.",
      tags: ["1:1", "quiet", "cognitive"]
    },
    {
      id: "oneone-3",
      title: "Sensory Comfort Cart Visit",
      content:
        "Offer two or three sensory options:\n- textured fabric swatch\n- familiar scent card\n- soft background music\n\nLet resident choose one and keep interaction calm, brief, and preference-led.",
      tags: ["sensory", "1:1", "resident choice"]
    },
    {
      id: "oneone-4",
      title: "Photo Memory Chat",
      content:
        "Use old magazine photos, postcards, or printed scene cards.\n- Ask one memory prompt at a time\n- Keep questions concrete and positive\n- Reflect back key themes you hear\n\nExcellent for residents who open up with visual prompts.",
      tags: ["memory", "visual", "1:1"]
    },
    {
      id: "oneone-5",
      title: "Music + Mood Support Visit",
      content:
        "Build a short personalized playlist.\n- Play 2-3 familiar songs\n- Offer humming, lyric recall, or simple tapping\n- Ask: “Would you like this type of visit again this week?”\n\nUse this when group refusal is high but music response is positive.",
      tags: ["music", "1:1", "engagement"]
    }
  ],
  bedBoundResidentIdeas: [
    {
      id: "bedbound-1",
      title: "Bedside Music Memory Session",
      content:
        "Bed-bound friendly visit plan:\n- Greet and orient to day/time\n- Play one familiar song clip\n- Ask one memory question tied to the song\n- Close with preferred song request for next visit\n\nKeep stimulation gentle and volume low.",
      tags: ["bed-bound", "music", "bedside"]
    },
    {
      id: "bedbound-2",
      title: "Bedside Trivia and Choice",
      content:
        "Use 8-10 easy either/or questions.\n- Favorite season?\n- Coffee or tea?\n- Morning or evening activities?\n\nFinish by offering one activity choice for tomorrow’s bedside follow-up.",
      tags: ["bed-bound", "conversation", "choice"]
    },
    {
      id: "bedbound-3",
      title: "Hands-Only Activity Box",
      content:
        "Bring lightweight items:\n- soft stress ball\n- large-piece cards\n- tactile fidget item\n\nOffer one item at a time and document tolerance, preference, and mood response.",
      tags: ["bed-bound", "sensory", "fine-motor"]
    },
    {
      id: "bedbound-4",
      title: "Guided Reminiscing",
      content:
        "Use a 10-minute reminiscence script.\n- “Tell me about your favorite holiday meal.”\n- “What music did you enjoy in your 20s?”\n- “What made a good day for you?”\n\nThis supports emotional connection and personalized future planning.",
      tags: ["bed-bound", "reminiscence", "emotional support"]
    },
    {
      id: "bedbound-5",
      title: "Window Watch + Reflection",
      content:
        "Simple calming bedside engagement:\n- Observe outside scene together for 2-3 minutes\n- Ask what they notice\n- Connect observation to a gentle memory prompt\n\nUseful for residents with low energy or short attention windows.",
      tags: ["bed-bound", "calm", "low stimulation"]
    }
  ],
  dementiaFriendlyIdeas: [
    {
      id: "dementia-1",
      title: "Familiar Song Circle",
      content:
        "Dementia-friendly group format:\n- Start with orientation cue (day/date/season)\n- Use well-known songs from preferred era\n- Encourage clapping, humming, and short lyric call-outs\n\nKeep transitions slow and instructions one step at a time.",
      tags: ["dementia-friendly", "music", "group"]
    },
    {
      id: "dementia-2",
      title: "Sorting and Matching Station",
      content:
        "Set up a calm tabletop activity.\n- Sort cards by color or picture type\n- Match object-photo pairs\n- Offer praise for effort, not speed\n\nUse high-contrast visuals and avoid multi-step directions.",
      tags: ["dementia-friendly", "cognitive", "tabletop"]
    },
    {
      id: "dementia-3",
      title: "Sensory Story Time",
      content:
        "Read a short story while passing simple sensory items.\n- lavender sachet, soft cloth, textured card\n- pause for one-question reflections\n- keep total time to 12-15 minutes\n\nThis supports engagement without overload.",
      tags: ["dementia-friendly", "sensory", "structured"]
    },
    {
      id: "dementia-4",
      title: "Movement to Music (Seated)",
      content:
        "Lead gentle seated movement with familiar tunes.\n- hand raises, shoulder rolls, toe taps\n- cue each movement visually and verbally\n- keep pace slow and reassuring\n\nGreat for afternoon restlessness and redirection.",
      tags: ["dementia-friendly", "seated movement", "redirection"]
    },
    {
      id: "dementia-5",
      title: "Simple Purposeful Task",
      content:
        "Offer one meaningful task:\n- folding towels\n- pairing socks\n- sorting greeting cards\n\nUse this for residents who engage best with routine and purposeful activity.",
      tags: ["dementia-friendly", "purposeful", "routine"]
    }
  ],
  progressNoteHelp: [
    {
      id: "pnote-1",
      title: "Progress Note Draft: Active Participation",
      content:
        "Resident attended afternoon bingo group and participated with moderate to high engagement. Resident independently responded to prompts, interacted positively with peers, and remained in group for full duration. Mood appeared pleasant and cooperative. No behavioral concerns noted. Continue offering similar social group opportunities to support ongoing engagement.",
      tags: ["progress note", "group", "positive response"]
    },
    {
      id: "pnote-2",
      title: "Progress Note Draft: Encouragement Needed",
      content:
        "Resident was invited to music trivia group and attended with verbal encouragement. During activity, resident demonstrated intermittent participation, including brief responses to familiar songs and occasional peer interaction. Affect remained calm. Resident tolerated full session with cueing. Continue to provide encouragement and preferred music-based programming.",
      tags: ["progress note", "encouragement", "intermittent participation"]
    },
    {
      id: "pnote-3",
      title: "Progress Note Draft: Declined Group",
      content:
        "Resident was approached for scheduled afternoon group and declined participation at this time, stating preference to remain in room. Resident was offered alternate 1:1 check-in and accepted brief bedside conversation. Affect appeared neutral. Follow-up recommended with preferred activity options during next programming window.",
      tags: ["progress note", "declined", "follow-up"]
    },
    {
      id: "pnote-4",
      title: "Progress Note Draft: Passive Attendance",
      content:
        "Resident attended group activity and remained present throughout session. Participation was primarily passive; resident observed peers and responded minimally to prompts. No signs of distress observed. Resident appeared comfortable in group environment. Continue exposure to similar structured social activities with gentle cueing to increase engagement.",
      tags: ["progress note", "passive", "group tolerance"]
    },
    {
      id: "pnote-5",
      title: "Progress Note Draft: Positive Social Interaction",
      content:
        "Resident participated in afternoon social and demonstrated improved peer engagement compared to prior sessions. Resident initiated brief conversation with tablemate and responded positively to activity prompts. Mood was bright with appropriate affect. Continue offering social and music-related programming, which appears to support meaningful participation.",
      tags: ["progress note", "social gains", "engagement trend"]
    }
  ],
  oneToOneNoteHelp: [
    {
      id: "onote-1",
      title: "1:1 Note Draft: Room Visit Conversation",
      content:
        "Completed 1:1 room visit with resident for supportive conversation. Resident was alert and receptive, discussing family memories and preferred past activities. Resident maintained appropriate eye contact and engaged throughout visit. Mood appeared calm. Continue scheduled 1:1 visits to support social connection.",
      tags: ["1:1 note", "room visit", "supportive conversation"]
    },
    {
      id: "onote-2",
      title: "1:1 Note Draft: Puzzle Engagement",
      content:
        "Resident participated in bedside 1:1 puzzle activity with moderate engagement. Resident required minimal cueing to begin and completed task segments with encouragement. Affect was neutral to pleasant. Resident verbalized enjoyment of quiet independent-style activities. Continue offering short cognitive 1:1 options.",
      tags: ["1:1 note", "cognitive", "bedside"]
    },
    {
      id: "onote-3",
      title: "1:1 Note Draft: Sensory Support",
      content:
        "Resident received 1:1 sensory-focused visit including soft music and tactile items. Resident tolerated interaction well and showed visible relaxation during session. Minimal verbal response but nonverbal indicators suggested comfort. Continue sensory-based 1:1 interventions as tolerated.",
      tags: ["1:1 note", "sensory", "calming"]
    },
    {
      id: "onote-4",
      title: "1:1 Note Draft: Emotional Support Check-In",
      content:
        "Resident seen for brief 1:1 emotional support visit following group refusal earlier in day. Resident shared feeling tired and preferred low-stimulation interaction. Resident accepted reassurance and engaged in brief conversation. Mood improved by end of visit. Follow-up with preferred afternoon 1:1 option recommended.",
      tags: ["1:1 note", "emotional support", "follow-up"]
    },
    {
      id: "onote-5",
      title: "1:1 Note Draft: Bed-Bound Engagement",
      content:
        "Conducted 1:1 bedside engagement using familiar music and reminiscence prompts. Resident responded positively, smiling and sharing brief memories related to songs played. Resident remained attentive for session duration. Continue bedside music-based visits to support meaningful engagement.",
      tags: ["1:1 note", "bed-bound", "music-based"]
    }
  ],
  carePlanWording: [
    {
      id: "careplan-1",
      title: "Care Plan Goal + Intervention: Social Engagement",
      content:
        "Goal: Resident will participate in preferred group or 1:1 activity at least 3 times weekly as tolerated.\nInterventions:\n- Offer music and social game programming aligned with resident preferences.\n- Provide verbal encouragement and afternoon scheduling when possible.\n- Monitor participation response and update approach based on acceptance patterns.",
      tags: ["care plan", "goal", "intervention"]
    },
    {
      id: "careplan-2",
      title: "Care Plan Wording: Low Group Tolerance",
      content:
        "Goal: Resident will increase meaningful activity engagement through individualized participation opportunities.\nInterventions:\n- Provide short-duration 1:1 visits when resident declines group activity.\n- Offer two activity choices to support resident autonomy.\n- Document participation barriers and preferred alternatives for ongoing plan refinement.",
      tags: ["care plan", "1:1", "resident choice"]
    },
    {
      id: "careplan-3",
      title: "Care Plan Wording: Cognitive Support",
      content:
        "Goal: Resident will demonstrate participation in cognitively supportive activity programming 2-3 times weekly as tolerated.\nInterventions:\n- Provide structured, cue-based activities with simplified instructions.\n- Use familiar topics, music, and visual prompts to improve engagement.\n- Coordinate with care team regarding effective cueing strategies.",
      tags: ["care plan", "cognitive support", "cueing"]
    },
    {
      id: "careplan-4",
      title: "Care Plan Wording: Bedside Engagement",
      content:
        "Goal: Resident will engage in bedside activity interactions to support quality of life and social connection.\nInterventions:\n- Provide bedside music, conversation, and sensory options based on preference.\n- Offer brief sessions with flexible timing based on resident endurance.\n- Track response and adjust intervention type for best tolerance.",
      tags: ["care plan", "bedside", "quality of life"]
    },
    {
      id: "careplan-5",
      title: "Care Plan Wording: Refusal Pattern Follow-Up",
      content:
        "Goal: Resident will demonstrate reduced repeated refusal through personalized activity approach.\nInterventions:\n- Review refusal trends weekly to identify timing and format barriers.\n- Offer resident-preferred alternatives (small group, 1:1, quiet room options).\n- Communicate meaningful participation changes during interdisciplinary updates.",
      tags: ["care plan", "refusal support", "follow-up"]
    }
  ],
  calendarPlanningHelp: [
    {
      id: "calendar-1",
      title: "Week Plan: Balanced Energy",
      content:
        "Try this simple weekly structure:\n- Monday: Social icebreaker + seated movement\n- Tuesday: Music trivia + 1:1 follow-up block\n- Wednesday: Craft social + room visits\n- Thursday: Word games + sensory cart\n- Friday: Choice-based social hour + recap\n\nThis keeps variety while staying manageable for staffing.",
      tags: ["calendar", "weekly structure", "balanced"]
    },
    {
      id: "calendar-2",
      title: "Fill Empty Days Quickly",
      content:
        "For blank calendar slots, use this fast fill method:\n- 1 anchor group (music, bingo, trivia)\n- 1 quiet option (word search, puzzle corner)\n- 1 1:1 block for high-need residents\n- 1 backup mini-activity\n\nRepeat with different themes to complete the week fast.",
      tags: ["calendar", "gap fill", "fast planning"]
    },
    {
      id: "calendar-3",
      title: "Low-Budget Monthly Flow",
      content:
        "Use recurring low-cost blocks each week:\n- Memory Monday: reminiscence prompts\n- Tune Tuesday: sing-along and lyric game\n- Word Wednesday: trivia and puzzles\n- Thankful Thursday: gratitude circle\n- Fun Friday: game show style social\n\nMost supplies are reusable and easy to prep.",
      tags: ["calendar", "monthly", "low cost"]
    },
    {
      id: "calendar-4",
      title: "Rainy-Day Backup Calendar",
      content:
        "Keep a backup list for weather disruptions:\n- Hallway trivia cart\n- In-room music rounds\n- Seated balloon circle\n- Card-making station\n- Tabletop sensory basket\n\nAssign one staff lead and one support person to move fast.",
      tags: ["calendar", "backup", "weather plan"]
    },
    {
      id: "calendar-5",
      title: "Theme Week Starter",
      content:
        "Sample “Spring Memory Week”:\n- Mon: Spring songs and stories\n- Tue: Flower craft social\n- Wed: Garden trivia challenge\n- Thu: Spring snack social\n- Fri: Favorite spring traditions share\n\nAdd bedside spring sensory rounds for non-group participants.",
      tags: ["calendar", "theme week", "seasonal"]
    }
  ],
  holidayActivityPlanning: [
    {
      id: "holiday-1",
      title: "Holiday Backup Plan (Small Team)",
      content:
        "If staffing is tight, run:\n- 15 min holiday music and memory prompts\n- 15 min simple table craft\n- 10 min cocoa/social close\n\nOffer bedside holiday rounds for residents unable to attend group.",
      tags: ["holiday", "backup", "staff-light"]
    },
    {
      id: "holiday-2",
      title: "Holiday Week Template",
      content:
        "Plan one light feature each day:\n- Monday: Decorate and discuss traditions\n- Tuesday: Holiday trivia\n- Wednesday: Cookie social or snack tasting\n- Thursday: Card writing\n- Friday: Music celebration\n\nKeep activities predictable and short for better tolerance.",
      tags: ["holiday", "week plan", "predictable structure"]
    },
    {
      id: "holiday-3",
      title: "Inclusive Holiday Programming",
      content:
        "Use broad themes residents can connect to:\n- winter memories\n- favorite family meals\n- celebration music across decades\n- gratitude and reflection circle\n\nThis approach supports inclusion across different backgrounds and traditions.",
      tags: ["holiday", "inclusive", "conversation"]
    },
    {
      id: "holiday-4",
      title: "Holiday Sensory Cart",
      content:
        "Create a rolling holiday sensory cart:\n- themed scent cards\n- soft decor textures\n- classic music clips\n- festive photo cards\n\nGreat for 1:1 room visits and memory-care friendly engagement.",
      tags: ["holiday", "sensory", "1:1"]
    },
    {
      id: "holiday-5",
      title: "Low-Stress Holiday Social",
      content:
        "Use a calm 30-minute social format:\n- short welcome and orientation\n- sing-along with lyric sheet\n- simple group game\n- appreciation close-out\n\nKeep transitions smooth and avoid over-stimulation.",
      tags: ["holiday", "calm format", "group"]
    }
  ],
  residentEngagementSuggestions: [
    {
      id: "engage-1",
      title: "Personalized Engagement Quick Map",
      content:
        "Use this mini profile approach:\n- 2 known interests\n- best time of day\n- preferred activity format (group vs 1:1)\n- one barrier (fatigue, noise, transport)\n\nThen offer one matched activity and one backup option each day.",
      tags: ["resident engagement", "personalization", "workflow"]
    },
    {
      id: "engage-2",
      title: "When Group Refusal Is Repeated",
      content:
        "Try this pattern:\n- Offer binary choice instead of open-ended invite\n- Shift to shorter 1:1 contact first\n- Re-attempt small-group option later in preferred time window\n\nTrack acceptance trends for one week before adjusting plan again.",
      tags: ["engagement", "refusal support", "follow-up"]
    },
    {
      id: "engage-3",
      title: "Quiet Engagement Options",
      content:
        "For residents who avoid busy groups:\n- bedside music with memory prompts\n- one-page puzzles\n- magazine/photo discussion\n- short card game or domino round\n\nDocument which format gets the strongest response and repeat it consistently.",
      tags: ["engagement", "quiet options", "1:1"]
    },
    {
      id: "engage-4",
      title: "Conversation Starter Set",
      content:
        "Use quick prompts to reduce blank moments:\n- “What music always puts you in a better mood?”\n- “What was your favorite season growing up?”\n- “What was a good day like for you?”\n\nThese questions help build meaningful relationship notes fast.",
      tags: ["engagement", "conversation", "relationship-building"]
    },
    {
      id: "engage-5",
      title: "Best-Match Activity Rotation",
      content:
        "Create a 3-option rotation per resident:\n- one social option\n- one quiet option\n- one sensory or music option\n\nRotate based on response to prevent boredom while keeping familiar structure.",
      tags: ["engagement", "activity matching", "consistency"]
    }
  ],
  lowBudgetActivityIdeas: [
    {
      id: "budget-1",
      title: "No-Cost Social Hour",
      content:
        "Use conversation cards made from index paper.\n- Topic rounds: favorite foods, songs, travel memories\n- Add simple team points for fun\n- End with resident choice question for next session\n\nSupplies: index cards + marker only.",
      tags: ["low-budget", "social", "no-cost"]
    },
    {
      id: "budget-2",
      title: "Paper-Based Activity Set",
      content:
        "Build a reusable print pack:\n- trivia sheets\n- word finds\n- large-print quote match\n- seasonal coloring pages\n\nStore by month to reduce repeated prep time.",
      tags: ["low-budget", "printables", "reusable"]
    },
    {
      id: "budget-3",
      title: "Music and Movement Lite",
      content:
        "Run a seated movement block using free playlists.\n- warm-up stretch\n- rhythm claps\n- favorite song close\n\nNo additional materials needed beyond a speaker.",
      tags: ["low-budget", "movement", "music"]
    },
    {
      id: "budget-4",
      title: "Resident-Led Memory Share",
      content:
        "Invite residents to lead short memory prompts.\n- each resident shares one memory topic\n- peers ask one follow-up question\n- staff captures favorite quotes for future groups\n\nMinimal supplies and strong social payoff.",
      tags: ["low-budget", "resident-led", "social"]
    },
    {
      id: "budget-5",
      title: "DIY Seasonal Craft Lite",
      content:
        "Use basic supplies for broad seasonal craft options.\n- construction paper\n- markers\n- glue stick\n- recycled magazines\n\nKeep templates simple so residents can complete in 20-30 minutes.",
      tags: ["low-budget", "craft", "seasonal"]
    }
  ],
  fallback: [
    {
      id: "fallback-1",
      title: "I Can Help With These Tasks",
      content:
        "I can help with activity ideas, note support, calendar planning, bed-bound visit ideas, dementia-friendly options, holiday planning, and low-budget activity backups.\n\nTry a prompt like:\n- “Give me a 15-minute backup activity.”\n- “Write a progress note for bingo participation.”\n- “Help me fill next week’s calendar gaps.”",
      tags: ["help", "quick start", "assistant guide"]
    },
    {
      id: "fallback-2",
      title: "Let’s Narrow It Down",
      content:
        "If you share one detail, I can give a better response:\n- Group or 1:1?\n- Low energy or high energy?\n- Note draft or planning help?\n- Any resident limitation to account for?\n\nExample: “Give me a dementia-friendly 1:1 for afternoon.”",
      tags: ["clarify", "guided prompt", "support"]
    },
    {
      id: "fallback-3",
      title: "Quick Actions You Can Ask For",
      content:
        "Pick one and I’ll build it:\n- A ready-to-use progress note draft\n- 5 low-budget group ideas\n- A themed week plan\n- Bedside engagement ideas\n- Holiday backup plan\n\nI’ll keep it practical and easy to copy.",
      tags: ["quick actions", "easy prompts", "planning"]
    },
    {
      id: "fallback-4",
      title: "Fast Prompt Starter",
      content:
        "Try this format for better results:\n“Need: [idea or note], Setting: [group/1:1], Resident needs: [low energy, bed-bound, dementia-friendly], Time: [10/15/30 min].”\n\nExample: “Need a 15-minute group idea for low-energy residents.”",
      tags: ["prompt format", "faster results", "starter"]
    },
    {
      id: "fallback-5",
      title: "Assistant Support Scope",
      content:
        "I’m focused on practical Activities Director support:\n- activity ideas\n- backup plans\n- note wording drafts\n- calendar suggestions\n- resident engagement support\n\nShare your goal and I’ll return a ready-to-use option.",
      tags: ["scope", "assistant", "practical"]
    }
  ]
};

