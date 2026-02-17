import { PrismaClient, type CuesRequired, type MoodAffect, type ParticipationLevel, type ResponseType } from "@prisma/client";
import { z } from "zod";

import { zonedDateStringToUtcStart } from "../lib/timezone";

const TIME_ZONE = "America/Chicago";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

const noteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  residentFirstName: z.string().min(1),
  residentLastName: z.string().min(1),
  roomAtTime: z.string().min(1).nullable(),
  location: z.string().min(1),
  activityDescription: z.string().min(1),
  mood: z.enum(["Bright", "Calm", "Flat", "Anxious", "Agitated"]),
  participationLevel: z.enum(["Low", "Moderate", "High"]),
  cues: z.array(z.enum(["None", "Verbal", "Visual", "Hand-over-hand"])).min(1),
  responseType: z.enum(["Positive", "Neutral", "Resistant"]),
  followUpIntervention: z.string().min(1)
});

const notesInput = z.array(noteSchema).min(1).parse([
  {
    "date": "2025-12-02",
    "startTime": "09:45",
    "endTime": "10:00",
    "residentFirstName": "Sharon",
    "residentLastName": "Hook",
    "roomAtTime": null,
    "location": "Front porch",
    "activityDescription": "1:1 outdoor leisure visit with AD. Resident sat on porch and engaged through humming/singing.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue brief porch visits with music cues; offer sing-along/familiar tunes to sustain engagement."
  },
  {
    "date": "2025-12-02",
    "startTime": "11:15",
    "endTime": "11:25",
    "residentFirstName": "Raymond",
    "residentLastName": "Lennington",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 sensory/leisure visit with preferred music in-room; resident also accepted cake pops during visit.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue music-based 1:1 visits using preferred snacks/food motivators to support participation."
  },
  {
    "date": "2025-12-02",
    "startTime": "11:30",
    "endTime": "11:55",
    "residentFirstName": "Shirley",
    "residentLastName": "Miller",
    "roomAtTime": "1B",
    "location": "Resident room",
    "activityDescription": "1:1 supportive visit with AD and SLP. Resident discussed family and watched TV; AD provided encouragement during speech therapy engagement.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Coordinate with SLP for continued supportive visits; offer short structured conversation prompts to support success."
  },
  {
    "date": "2025-12-03",
    "startTime": "11:00",
    "endTime": "11:30",
    "residentFirstName": "Angela",
    "residentLastName": "Krajca",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 socialization while watching TV; supportive conversation with AD.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Continue brief 1:1 check-ins using preferred TV shows as an engagement anchor."
  },
  {
    "date": "2025-12-03",
    "startTime": "13:00",
    "endTime": "13:30",
    "residentFirstName": "Shiela",
    "residentLastName": "Brown",
    "roomAtTime": null,
    "location": "Dining room",
    "activityDescription": "1:1 card game (Kings Corner) targeting leisure engagement, strategy, and pattern recognition. Resident won a game and expressed pride.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Offer recurring Kings Corner sessions; consider transitioning to small-group play to support socialization."
  },
  {
    "date": "2025-12-03",
    "startTime": "13:30",
    "endTime": "14:00",
    "residentFirstName": "Vick",
    "residentLastName": "Stewart",
    "roomAtTime": null,
    "location": "Front porch",
    "activityDescription": "1:1 Deal or No Deal game on porch to promote leisure, decision-making, and strategy use.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue game-based 1:1 sessions; consider adding a peer for a 2-person version to support social engagement."
  },
  {
    "date": "2025-12-04",
    "startTime": "11:30",
    "endTime": "12:00",
    "residentFirstName": "Tomma",
    "residentLastName": "George",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 Kings Corner card game in-room. Resident voiced interest in playing with a group for socialization.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Schedule a small-group card session; identify 2–3 residents who enjoy cards and introduce a regular card social time."
  },
  {
    "date": "2025-12-05",
    "startTime": "12:30",
    "endTime": "12:45",
    "residentFirstName": "Thomas",
    "residentLastName": "Carpenter",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 socialization while watching Cowboys highlights; resident discussed players/games with AD.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Offer weekly sports highlight visits or a sports chat group; use game schedules/highlights as conversation starters."
  },
  {
    "date": "2025-12-08",
    "startTime": "13:00",
    "endTime": "13:30",
    "residentFirstName": "Alphonso",
    "residentLastName": "Johnson",
    "roomAtTime": null,
    "location": "Resident area",
    "activityDescription": "Attempted 1:1 visit; resident declined and stated preference for group bingo.",
    "mood": "Flat",
    "participationLevel": "Low",
    "cues": ["None"],
    "responseType": "Resistant",
    "followUpIntervention": "Re-approach next week with choice-based offer (mini-bingo warm-up, paired activity, or brief 1:1 that supports bingo preference)."
  },
  {
    "date": "2025-12-08",
    "startTime": "12:00",
    "endTime": "12:15",
    "residentFirstName": "Warren",
    "residentLastName": "Lugo",
    "roomAtTime": null,
    "location": "Front porch",
    "activityDescription": "1:1 outdoor conversation about movies, games, and family. Resident requested continued outdoor chats.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Add recurring porch social visits to schedule; bring themed prompts (movies/games) to sustain engagement."
  },
  {
    "date": "2025-12-10",
    "startTime": "12:30",
    "endTime": "12:45",
    "residentFirstName": "Brenda",
    "residentLastName": "Meeks",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 Who Wants To Be A Millionaire session to support leisure, critical thinking, and recall.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue quiz/trivia-based 1:1; tailor categories to preferences and adjust difficulty over time."
  },
  {
    "date": "2025-12-10",
    "startTime": "14:00",
    "endTime": "15:00",
    "residentFirstName": "Warren",
    "residentLastName": "Lugo",
    "roomAtTime": null,
    "location": "Front porch",
    "activityDescription": "Extended 1:1 outdoor socialization discussing Walmart order, marriage, and facility adjustment/history.",
    "mood": "Calm",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue every-other-day porch visits; include light goal-setting and preferred-topic prompts."
  },
  {
    "date": "2025-12-11",
    "startTime": "11:00",
    "endTime": "11:15",
    "residentFirstName": "Paul",
    "residentLastName": "Harman",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 leisure interaction with AD demonstrating simple magic card tricks for enjoyment and social engagement.",
    "mood": "Bright",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue brief magic visits; consider teaching a simple trick to promote participation and confidence."
  },
  {
    "date": "2025-12-11",
    "startTime": "15:30",
    "endTime": "15:45",
    "residentFirstName": "Robert",
    "residentLastName": "Fay",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "Attempted 1:1 card activity; resident declined participation.",
    "mood": "Flat",
    "participationLevel": "Low",
    "cues": ["None"],
    "responseType": "Resistant",
    "followUpIntervention": "Re-attempt within a few days offering 2–3 choices (different game, music, brief visit) and keep session resident-led."
  },
  {
    "date": "2025-12-12",
    "startTime": "16:00",
    "endTime": null,
    "residentFirstName": "Jeff",
    "residentLastName": "Power",
    "roomAtTime": null,
    "location": "Facility walk",
    "activityDescription": "1:1 walk throughout facility with conversation about Christmas plans, facility life, and past jobs; promoted physical activity and socialization.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue walking visits as tolerated; incorporate destination-based walks (decor, bulletin boards) for added interest."
  },
  {
    "date": "2025-12-13",
    "startTime": "11:00",
    "endTime": null,
    "residentFirstName": "Eli",
    "residentLastName": "Torres",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 socialization and creative engagement discussing resident artwork; resident worked with colored pencils/canvases on a Christmas mural.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Provide continued art support (supplies, display option); plan a resident art spotlight to encourage motivation."
  },
  {
    "date": "2025-12-18",
    "startTime": "11:00",
    "endTime": null,
    "residentFirstName": "Shiela",
    "residentLastName": "Brown",
    "roomAtTime": null,
    "location": "Dining room",
    "activityDescription": "1:1 arts/crafts creating reindeer necklace ornaments to support leisure and engagement.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Offer additional seasonal crafts and invite resident to assist peers during a group craft session."
  },
  {
    "date": "2025-12-28",
    "startTime": "10:00",
    "endTime": null,
    "residentFirstName": "Eleanor",
    "residentLastName": "Ray",
    "roomAtTime": "30A",
    "location": "Resident room",
    "activityDescription": "1:1 therapeutic cognitive activity with SLP and AD playing Hangman; targeted problem-solving and recall.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Continue coordinated SLP/Activities word games; document preferred categories for future sessions."
  },
  {
    "date": "2026-01-05",
    "startTime": "12:00",
    "endTime": "13:15",
    "residentFirstName": "Jay",
    "residentLastName": "Lloyd",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 word search activity for cognitive stimulation and leisure engagement.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue puzzle-based 1:1 sessions; introduce themed word searches for variety."
  },
  {
    "date": "2026-01-07",
    "startTime": "10:00",
    "endTime": "10:30",
    "residentFirstName": "Eleanor",
    "residentLastName": "Ray",
    "roomAtTime": "30A",
    "location": "Facility halls",
    "activityDescription": "1:1 purposeful walk searching lost and found for clothing items; engaged in supportive conversation about facility life and past experiences.",
    "mood": "Calm",
    "participationLevel": "High",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Continue purposeful walks with small 'missions' to support routine, engagement, and adjustment."
  },
  {
    "date": "2026-01-07",
    "startTime": "13:00",
    "endTime": "13:30",
    "residentFirstName": "Warren",
    "residentLastName": "Lugo",
    "roomAtTime": "39A",
    "location": "Front porch",
    "activityDescription": "1:1 outdoor leisure/socialization discussing facility life; resident expressed excitement for Bible study.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Maintain porch visit routine; support attendance to Bible study and other preferred programs."
  },
  {
    "date": "2026-01-09",
    "startTime": "11:00",
    "endTime": "11:30",
    "residentFirstName": "Raymond",
    "residentLastName": "Lennington",
    "roomAtTime": "38A",
    "location": "Resident room",
    "activityDescription": "1:1 sensory/leisure visit watching cartoons; resident accepted hot cocoa and remained calm/attentive.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue Friday 1:1 visits using preferred shows and food-based motivators."
  },
  {
    "date": "2026-01-15",
    "startTime": "13:00",
    "endTime": "13:30",
    "residentFirstName": "Bradley",
    "residentLastName": "Noel",
    "roomAtTime": "12A",
    "location": "Resident room",
    "activityDescription": "Post-hospital return 1:1 socialization with ESPN on TV; discussed sports and college athletics.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue short supportive visits; encourage participation in a preferred leisure group when ready."
  },
  {
    "date": "2026-01-16",
    "startTime": "11:00",
    "endTime": "11:30",
    "residentFirstName": "Raymond",
    "residentLastName": "Lennington",
    "roomAtTime": "38A",
    "location": "Bedside",
    "activityDescription": "1:1 individualized music session at bedside. Resident non-verbal and remained in bed; appeared relaxed/attentive during preferred songs. Food motivation used.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue sensory/music-based bedside visits; track preferred songs and response cues to guide playlist."
  },
  {
    "date": "2026-01-20",
    "startTime": "11:30",
    "endTime": "12:00",
    "residentFirstName": "Shirley",
    "residentLastName": "Miller",
    "roomAtTime": "1B",
    "location": "Resident room",
    "activityDescription": "SLP and AD facilitated a Family Feud style verbal game using category prompts; resident participated by guessing words aloud.",
    "mood": "Bright",
    "participationLevel": "Moderate",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Continue structured word games with supportive pacing and encouragement; start with easier prompts to reduce frustration."
  },
  {
    "date": "2026-01-20",
    "startTime": "13:00",
    "endTime": "13:30",
    "residentFirstName": "John",
    "residentLastName": "Tackett",
    "roomAtTime": "6A",
    "location": "Resident area",
    "activityDescription": "1:1 Family Feud activity promoting recall and social engagement; resident joked and laughed with AD.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue 1:1 leisure and socialization activities; consider a friendly team version with a peer."
  },
  {
    "date": "2026-01-21",
    "startTime": "11:00",
    "endTime": "11:30",
    "residentFirstName": "Laverne",
    "residentLastName": "Spracklen",
    "roomAtTime": "18A",
    "location": "Resident bedside",
    "activityDescription": "1:1 movie-based socialization while watching Harry Potter; discussed film preferences for emotional support and rapport.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue movie/theme discussions; offer related trivia or a small-group movie chat if interested."
  },
  {
    "date": "2026-01-21",
    "startTime": "13:30",
    "endTime": "14:00",
    "residentFirstName": "Edward",
    "residentLastName": "Dunham",
    "roomAtTime": "17A",
    "location": "Community outing (corner store)",
    "activityDescription": "1:1 supervised community outing. AD escorted resident and provided wheelchair support; resident selected and purchased snacks with assistance.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Schedule periodic supervised outings as appropriate; coordinate with care team regarding safety/transport needs."
  },
  {
    "date": "2026-01-22",
    "startTime": "12:30",
    "endTime": "13:00",
    "residentFirstName": "Shirley",
    "residentLastName": "Miller",
    "roomAtTime": "1B",
    "location": "Resident room",
    "activityDescription": "Resident declined group programming but requested bingo; AD facilitated 1:1 bingo with soda prizes. Assistance provided for number identification due to stroke effects.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["Verbal", "Visual"],
    "responseType": "Positive",
    "followUpIntervention": "Continue 1:1 bingo with adaptations (larger print, paced calling, visual supports) to support success."
  },
  {
    "date": "2026-01-22",
    "startTime": "13:00",
    "endTime": "13:30",
    "residentFirstName": "Shiela",
    "residentLastName": "Brown",
    "roomAtTime": "42B",
    "location": "Resident area",
    "activityDescription": "1:1 Hangman with category 'Famous People'; resident and AD alternated turns guessing actor names.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue Hangman with varied categories (movies/music/places) for ongoing cognitive stimulation."
  },
  {
    "date": "2026-01-23",
    "startTime": "11:00",
    "endTime": "11:30",
    "residentFirstName": "Jeffery",
    "residentLastName": "Manuel",
    "roomAtTime": "36B",
    "location": "Resident area",
    "activityDescription": "1:1 social visit discussing cars and day-to-day facility life; resident communicated needs/preferences appropriately.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue 1:1 check-ins as needed; encourage participation in preferred leisure groups."
  },
  {
    "date": "2026-01-23",
    "startTime": "12:30",
    "endTime": "13:00",
    "residentFirstName": "Raymond",
    "residentLastName": "Lennington",
    "roomAtTime": null,
    "location": "Resident room",
    "activityDescription": "1:1 music sensory activity with AD. Resident non-verbal; remained calm and demonstrated positive nonverbal engagement (relaxed affect, attentive posture).",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue individualized music sessions; track preferred songs and keep routine consistent."
  },
  {
    "date": "2026-01-23",
    "startTime": "13:00",
    "endTime": "13:30",
    "residentFirstName": "Paul",
    "residentLastName": "Harman",
    "roomAtTime": "31B",
    "location": "Common area",
    "activityDescription": "1:1 birthday celebration with ice cream cake; resident chose to share with peers/staff, promoting positive social interaction.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Encourage continued peer interaction through celebrations and resident-chosen social activities."
  },
  {
    "date": "2026-01-28",
    "startTime": "13:00",
    "endTime": "13:30",
    "residentFirstName": "Vick",
    "residentLastName": "Stewart",
    "roomAtTime": "29B",
    "location": "Dining room",
    "activityDescription": "1:1 Kings Corner card game promoting leisure, strategic thinking, and decision-making.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue strategy card games; consider a small card club time for routine social participation."
  },
  {
    "date": "2026-01-28",
    "startTime": "13:30",
    "endTime": "14:00",
    "residentFirstName": "Randall",
    "residentLastName": "Thompson",
    "roomAtTime": "12B",
    "location": "Resident area",
    "activityDescription": "1:1 visit watching Miami vs. Massachusetts basketball; resident discussed college sports and expressed enjoyment.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Offer sports watch/check-in visits and invite to any sports-themed group discussion when available."
  },
  {
    "date": "2026-01-30",
    "startTime": "11:00",
    "endTime": "11:30",
    "residentFirstName": "Warren",
    "residentLastName": "Lugo",
    "roomAtTime": "39A",
    "location": "Community outing (corner store)",
    "activityDescription": "1:1 supervised outing to purchase sodas and cigarettes. Resident ambulated safely and remained calm/engaged throughout.",
    "mood": "Calm",
    "participationLevel": "High",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Continue supervised outings per safety plan; confirm scheduling aligns with resident routine and preferences."
  },
  {
    "date": "2026-01-30",
    "startTime": "12:00",
    "endTime": "12:30",
    "residentFirstName": "Raymond",
    "residentLastName": "Lennington",
    "roomAtTime": "38A",
    "location": "Bedside",
    "activityDescription": "1:1 bedside music session with food motivation for reinforcement; resident non-verbal, attentive, and relaxed.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Maintain sensory/music routine; continue using preferred motivators and monitor for fatigue/overstimulation."
  },
  {
    "date": "2026-02-02",
    "startTime": "12:30",
    "endTime": "13:00",
    "residentFirstName": "Shirley",
    "residentLastName": "Miller",
    "roomAtTime": "1B",
    "location": "Resident room",
    "activityDescription": "Brief 1:1 supportive socialization with AD and SLP; discussed weekend and recent ice storm to promote orientation and connection.",
    "mood": "Calm",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue supportive visits; encourage participation in preferred groups and brief 1:1s as tolerated."
  },
  {
    "date": "2026-02-02",
    "startTime": "13:30",
    "endTime": "14:00",
    "residentFirstName": "Tammie",
    "residentLastName": "Gilliam",
    "roomAtTime": "9B",
    "location": "Resident room",
    "activityDescription": "1:1 word association game to promote cognitive stimulation and social engagement; resident participated with minimal cues.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["Verbal"],
    "responseType": "Positive",
    "followUpIntervention": "Continue 1:1 cognitive word games; introduce category naming or finish-the-phrase rounds next visit for variety."
  },
  {
    "date": "2026-02-02",
    "startTime": "14:00",
    "endTime": "14:30",
    "residentFirstName": "Eddy",
    "residentLastName": "Green",
    "roomAtTime": "36A",
    "location": "Outdoors",
    "activityDescription": "1:1 outdoor socialization while resident played solitaire; conversation supported rapport and leisure engagement.",
    "mood": "Bright",
    "participationLevel": "Moderate",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue outdoor visits; offer optional shared activity (cards or trivia prompts) while respecting preferred independent leisure."
  },
  {
    "date": "2026-02-02",
    "startTime": "14:30",
    "endTime": "15:00",
    "residentFirstName": "Alphonso",
    "residentLastName": "Johnson",
    "roomAtTime": "11A",
    "location": "Back patio",
    "activityDescription": "1:1 outdoor conversation about activities, outings, and facility life; resident was positive and enthusiastic.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Follow through with outing/activity options; invite resident to next preferred group and continue patio social visits."
  },
  {
    "date": "2026-02-06",
    "startTime": "08:00",
    "endTime": "08:30",
    "residentFirstName": "Warren",
    "residentLastName": "Lugo",
    "roomAtTime": "16A",
    "location": "Outdoors",
    "activityDescription": "1:1 outdoor conversation about facility life, TV shows, games, and Comic Con interests.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue routine outdoor visits; bring themed conversation prompts to support ongoing engagement."
  },
  {
    "date": "2026-02-06",
    "startTime": "11:30",
    "endTime": "12:00",
    "residentFirstName": "Alphonso",
    "residentLastName": "Johnson",
    "roomAtTime": "11A",
    "location": "Outdoors",
    "activityDescription": "1:1 outdoor conversation while resident ate candy from AD prize cart; resident requested more candy options in future.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Stock preferred candy as a motivator; pair future visits with a short structured mini-activity choice (quick trivia, mini-bingo, or outing planning)."
  },
  {
    "date": "2026-02-16",
    "startTime": "11:00",
    "endTime": "11:30",
    "residentFirstName": "Tomma",
    "residentLastName": "George",
    "roomAtTime": "22B",
    "location": "Dining room",
    "activityDescription": "1:1 Kings Corner card game promoting leisure engagement and strategy; resident alert and positive.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Schedule recurring card sessions; consider inviting peers to build a consistent small-group social activity."
  },
  {
    "date": "2026-02-16",
    "startTime": "11:30",
    "endTime": "12:00",
    "residentFirstName": "Alphonso",
    "residentLastName": "Johnson",
    "roomAtTime": "11A",
    "location": "Outdoors",
    "activityDescription": "1:1 outdoor conversation with candy from prize cart; resident remained upbeat and requested continued access to preferred snacks.",
    "mood": "Bright",
    "participationLevel": "High",
    "cues": ["None"],
    "responseType": "Positive",
    "followUpIntervention": "Continue snack-supported social visits; rotate topics and offer scheduling for preferred groups/outings to support consistent engagement."
  }
]);

const participationMap: Record<z.infer<typeof noteSchema>["participationLevel"], ParticipationLevel> = {
  Low: "MINIMAL",
  Moderate: "MODERATE",
  High: "HIGH"
};

const moodMap: Record<z.infer<typeof noteSchema>["mood"], MoodAffect> = {
  Bright: "BRIGHT",
  Calm: "CALM",
  Flat: "FLAT",
  Anxious: "ANXIOUS",
  Agitated: "AGITATED"
};

const responseMap: Record<z.infer<typeof noteSchema>["responseType"], ResponseType> = {
  Positive: "POSITIVE",
  Neutral: "NEUTRAL",
  Resistant: "RESISTANT"
};

const cuesMap: Record<z.infer<typeof noteSchema>["cues"][number], CuesRequired> = {
  None: "NONE",
  Verbal: "VERBAL",
  Visual: "VISUAL",
  "Hand-over-hand": "HAND_OVER_HAND"
};

const firstNameAliasMap: Record<string, string> = {
  jeff: "jeffrey",
  jeffery: "jeffrey",
  eli: "elias",
  tammie: "tammy"
};

const lastNameAliasMap: Record<string, string> = {
  lennington: "lenington"
};

type ResidentLite = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  firstNorm: string;
  lastNorm: string;
  firstCanonical: string;
  lastCanonical: string;
};

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function canonicalFirstName(value: string) {
  const normalized = normalizeToken(value);
  return firstNameAliasMap[normalized] ?? normalized;
}

function canonicalLastName(value: string) {
  const normalized = normalizeToken(value);
  return lastNameAliasMap[normalized] ?? normalized;
}

function parseTimeToMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time value "${value}".`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value "${value}".`);
  }
  return hours * 60 + minutes;
}

function dateTimeInChicagoToUtc(dateKey: string, time: string) {
  const dayStart = zonedDateStringToUtcStart(dateKey, TIME_ZONE);
  if (!dayStart) {
    throw new Error(`Could not parse date key "${dateKey}".`);
  }
  const minutes = parseTimeToMinutes(time);
  return new Date(dayStart.getTime() + minutes * 60_000);
}

function formatDateKeyInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function formatTimeKeyInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildImportKey(args: {
  facilityId: string;
  residentFirstName: string;
  residentLastName: string;
  roomAtTime: string | null;
  date: string;
  startTime: string;
  activityDescription: string;
}) {
  return [
    args.facilityId,
    `${args.residentFirstName} ${args.residentLastName}`.trim(),
    args.roomAtTime ?? "",
    args.date,
    args.startTime,
    slugify(args.activityDescription)
  ].join("|");
}

function buildNarrative(
  row: z.infer<typeof noteSchema>,
  matchedResident: ResidentLite | null
) {
  const metadataLines: string[] = [];

  if (row.location.trim()) {
    metadataLines.push(`Location: ${row.location.trim()}`);
  }

  if (row.endTime) {
    metadataLines.push(`Session time: ${row.startTime}-${row.endTime} (${TIME_ZONE})`);
  } else {
    metadataLines.push(`Session start: ${row.startTime} (${TIME_ZONE})`);
  }

  if (row.roomAtTime) {
    metadataLines.push(`Room at time: ${row.roomAtTime}`);
    if (matchedResident && matchedResident.room !== row.roomAtTime) {
      metadataLines.push(`Current room: ${matchedResident.room}`);
    }
  }

  if (row.cues.length > 1) {
    metadataLines.push(`Cues used: ${row.cues.join(", ")}`);
  }

  if (metadataLines.length === 0) {
    return row.activityDescription.trim();
  }

  return `${row.activityDescription.trim()}\n\n${metadataLines.join("\n")}`;
}

function toResidentLite(row: {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
}): ResidentLite {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    room: row.room,
    firstNorm: normalizeToken(row.firstName),
    lastNorm: normalizeToken(row.lastName),
    firstCanonical: canonicalFirstName(row.firstName),
    lastCanonical: canonicalLastName(row.lastName)
  };
}

function tryFindResidentMatch(
  residents: ResidentLite[],
  row: z.infer<typeof noteSchema>
): { resident: ResidentLite; strategy: string } | null {
  const firstNorm = normalizeToken(row.residentFirstName);
  const lastNorm = normalizeToken(row.residentLastName);
  const firstCanonical = canonicalFirstName(row.residentFirstName);
  const lastCanonical = canonicalLastName(row.residentLastName);
  const roomNorm = row.roomAtTime ? row.roomAtTime.trim().toLowerCase() : null;

  const byRoom = roomNorm ? residents.filter((resident) => resident.room.trim().toLowerCase() === roomNorm) : residents;

  const exactWithRoom = byRoom.find((resident) => resident.firstNorm === firstNorm && resident.lastNorm === lastNorm);
  if (exactWithRoom) {
    return { resident: exactWithRoom, strategy: "exact-name-room" };
  }

  const exactName = residents.find((resident) => resident.firstNorm === firstNorm && resident.lastNorm === lastNorm);
  if (exactName) {
    return { resident: exactName, strategy: "exact-name" };
  }

  const canonicalWithRoom = byRoom.find(
    (resident) => resident.firstCanonical === firstCanonical && resident.lastCanonical === lastCanonical
  );
  if (canonicalWithRoom) {
    return { resident: canonicalWithRoom, strategy: "canonical-name-room" };
  }

  const canonicalName = residents.find(
    (resident) => resident.firstCanonical === firstCanonical && resident.lastCanonical === lastCanonical
  );
  if (canonicalName) {
    return { resident: canonicalName, strategy: "canonical-name" };
  }

  if (roomNorm) {
    const roomPlusLast = byRoom.find((resident) => resident.lastCanonical === lastCanonical);
    if (roomPlusLast) {
      return { resident: roomPlusLast, strategy: "room-lastname" };
    }

    if (byRoom.length === 1) {
      return { resident: byRoom[0], strategy: "unique-room" };
    }
  }

  return null;
}

async function findJasonScope() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: "Jason Addington", mode: "insensitive" } },
        { email: { contains: "jasonaddington817", mode: "insensitive" } },
        { email: { contains: "jaeboy", mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      facilityId: true,
      facility: {
        select: {
          name: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('Could not find user "Jason Addington" (or matching email) to resolve tenant scope.');
  }

  return user;
}

async function ensureFallbackResident(
  facilityId: string,
  row: z.infer<typeof noteSchema>,
  residents: ResidentLite[]
) {
  const existing = await prisma.resident.findFirst({
    where: {
      facilityId,
      firstName: { equals: row.residentFirstName, mode: "insensitive" },
      lastName: { equals: row.residentLastName, mode: "insensitive" }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true
    }
  });

  if (existing) {
    const lite = toResidentLite(existing);
    residents.push(lite);
    return { resident: lite, createdResident: false };
  }

  const created = await prisma.resident.create({
    data: {
      facilityId,
      firstName: row.residentFirstName,
      lastName: row.residentLastName,
      room: "TBD",
      status: "ACTIVE",
      isActive: true,
      notes: "Created by 1:1 note import; update room if needed."
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true
    }
  });

  const lite = toResidentLite(created);
  residents.push(lite);
  return { resident: lite, createdResident: true };
}

function extractRoomAtTimeFromNarrative(narrative: string) {
  const match = narrative.match(/(?:^|\n)Room at time:\s*(.+)\s*$/m);
  return match?.[1]?.trim() || null;
}

function extractActivityDescriptionFromNarrative(narrative: string) {
  return narrative.split("\n\n")[0].trim();
}

async function main() {
  const jason = await findJasonScope();

  const residents = (await prisma.resident.findMany({
    where: { facilityId: jason.facilityId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true
    }
  })).map(toResidentLite);

  let createdCount = 0;
  let skippedCount = 0;
  let fallbackResidentsCreated = 0;
  let fallbackResidentsReused = 0;
  const matchStrategyCounts: Record<string, number> = {};
  const existingImportKeys = new Set<string>();

  const existingOneToOne = await prisma.progressNote.findMany({
    where: {
      type: "ONE_TO_ONE",
      resident: { facilityId: jason.facilityId },
      createdByUserId: jason.id
    },
    select: {
      createdAt: true,
      narrative: true,
      resident: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  for (const existing of existingOneToOne) {
    const importKey = buildImportKey({
      facilityId: jason.facilityId,
      residentFirstName: existing.resident.firstName,
      residentLastName: existing.resident.lastName,
      roomAtTime: extractRoomAtTimeFromNarrative(existing.narrative),
      date: formatDateKeyInTimeZone(existing.createdAt, TIME_ZONE),
      startTime: formatTimeKeyInTimeZone(existing.createdAt, TIME_ZONE),
      activityDescription: extractActivityDescriptionFromNarrative(existing.narrative)
    });
    existingImportKeys.add(importKey);
  }

  for (const row of notesInput) {
    let match = tryFindResidentMatch(residents, row);
    if (!match) {
      const fallback = await ensureFallbackResident(jason.facilityId, row, residents);
      match = { resident: fallback.resident, strategy: fallback.createdResident ? "fallback-created-resident" : "fallback-existing-resident" };
      if (fallback.createdResident) {
        fallbackResidentsCreated += 1;
      } else {
        fallbackResidentsReused += 1;
      }
    }

    matchStrategyCounts[match.strategy] = (matchStrategyCounts[match.strategy] ?? 0) + 1;

    const importKey = buildImportKey({
      facilityId: jason.facilityId,
      residentFirstName: match.resident.firstName,
      residentLastName: match.resident.lastName,
      roomAtTime: row.roomAtTime,
      date: row.date,
      startTime: row.startTime,
      activityDescription: row.activityDescription
    });

    if (existingImportKeys.has(importKey)) {
      skippedCount += 1;
      continue;
    }

    const occurredAt = dateTimeInChicagoToUtc(row.date, row.startTime);
    const narrative = buildNarrative(row, match.resident);

    await prisma.progressNote.create({
      data: {
        residentId: match.resident.id,
        activityInstanceId: null,
        type: "ONE_TO_ONE",
        participationLevel: participationMap[row.participationLevel],
        moodAffect: moodMap[row.mood],
        cuesRequired: cuesMap[row.cues[0]],
        response: responseMap[row.responseType],
        followUp: row.followUpIntervention,
        narrative,
        createdAt: occurredAt,
        createdByUserId: jason.id
      }
    });

    createdCount += 1;
    existingImportKeys.add(importKey);

    console.log(`CREATED ${importKey}`);
  }

  const oneToOneCount = await prisma.progressNote.count({
    where: {
      type: "ONE_TO_ONE",
      resident: { facilityId: jason.facilityId }
    }
  });

  const notesInImportRange = await prisma.progressNote.count({
    where: {
      type: "ONE_TO_ONE",
      resident: { facilityId: jason.facilityId },
      createdByUserId: jason.id,
      createdAt: {
        gte: dateTimeInChicagoToUtc("2025-12-02", "00:00"),
        lte: dateTimeInChicagoToUtc("2026-02-16", "23:59")
      }
    }
  });

  console.log(`Imported 1:1 notes for ${jason.name} (${jason.email}) in facility "${jason.facility.name}".`);
  console.log(`Tenant scope facilityId: ${jason.facilityId}`);
  console.log(JSON.stringify({
    datasetCount: notesInput.length,
    createdCount,
    skippedCount,
    fallbackResidentsCreated,
    fallbackResidentsReused,
    matchStrategyCounts,
    oneToOneCountForFacility: oneToOneCount,
    oneToOneCountInImportDateWindow: notesInImportRange
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("1:1 note import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
