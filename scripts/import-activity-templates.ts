import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Difficulty = "Easy" | "Moderate" | "Hard";

type TemplateDef = {
  title: string;
  category: string;
  difficulty: Difficulty;
};

const templateDefs: TemplateDef[] = [
  { title: "Name That Tune Social", category: "Music", difficulty: "Moderate" },
  { title: "Chair Yoga Flow", category: "Fitness/Movement", difficulty: "Easy" },
  { title: "Balloon Volleyball", category: "Fitness/Movement", difficulty: "Easy" },
  { title: "Coffee and Current Events", category: "Social", difficulty: "Easy" },
  { title: "Travel Postcard Club", category: "Creative Arts", difficulty: "Easy" },
  { title: "Memory Lane Photos", category: "Reminiscence", difficulty: "Easy" },
  { title: "Price Guess Challenge", category: "Games", difficulty: "Moderate" },
  { title: "Finish the Proverb", category: "Cognitive", difficulty: "Easy" },
  { title: "Scattergories Lite", category: "Games", difficulty: "Moderate" },
  { title: "Pictionary Relay", category: "Games", difficulty: "Hard" },
  { title: "Gentle Stretch and Breathe", category: "Wellness", difficulty: "Easy" },
  { title: "Rhythm Sticks Circle", category: "Music", difficulty: "Easy" },
  { title: "Hymn Sing-Along", category: "Music", difficulty: "Easy" },
  { title: "Poetry Share Circle", category: "Cognitive", difficulty: "Moderate" },
  { title: "Large-Print Book Chat", category: "Cognitive", difficulty: "Easy" },
  { title: "Pen Pal Corner", category: "Life Skills", difficulty: "Easy" },
  { title: "Thank-You Card Studio", category: "Creative Arts", difficulty: "Easy" },
  { title: "Seasonal Door Decor", category: "Creative Arts", difficulty: "Moderate" },
  { title: "No-Bake Parfait Social", category: "Life Skills", difficulty: "Moderate" },
  { title: "Gardening in Cups", category: "Life Skills", difficulty: "Moderate" },
  { title: "Herb Aroma Match", category: "Sensory", difficulty: "Easy" },
  { title: "Hand Massage Circle", category: "Wellness", difficulty: "Easy" },
  { title: "Nail Care Social", category: "Wellness", difficulty: "Moderate" },
  { title: "Pet Visit and Chat", category: "Social", difficulty: "Easy" },
  { title: "Armchair Travel Tour", category: "Reminiscence", difficulty: "Easy" },
  { title: "Decades Fashion Flashback", category: "Reminiscence", difficulty: "Moderate" },
  { title: "Story Starter Circle", category: "Creative Arts", difficulty: "Moderate" },
  { title: "Tabletop Bowling", category: "Games", difficulty: "Easy" },
  { title: "Bean Bag Toss", category: "Games", difficulty: "Easy" },
  { title: "Puzzle Swap Hour", category: "Independent", difficulty: "Easy" },
  { title: "Jigsaw Team Challenge", category: "Cognitive", difficulty: "Hard" },
  { title: "Pattern Block Designs", category: "Cognitive", difficulty: "Easy" },
  { title: "Lacing Card Craft", category: "Creative Arts", difficulty: "Easy" },
  { title: "Kitchen Tool Match", category: "Life Skills", difficulty: "Moderate" },
  { title: "Budget Basket Match", category: "Life Skills", difficulty: "Moderate" },
  { title: "Calendar Planning Club", category: "Independent", difficulty: "Easy" },
  { title: "Gratitude Journaling", category: "Independent", difficulty: "Easy" },
  { title: "Guided Relaxation Break", category: "Wellness", difficulty: "Easy" },
  { title: "Seated Tai Chi Basics", category: "Fitness/Movement", difficulty: "Moderate" },
  { title: "Hallway Walking Club", category: "Fitness/Movement", difficulty: "Moderate" },
  { title: "Hallway Scavenger Hunt", category: "Games", difficulty: "Moderate" },
  { title: "Neighborhood Memory Map", category: "Reminiscence", difficulty: "Moderate" },
  { title: "Famous Faces Match-Up", category: "Cognitive", difficulty: "Moderate" },
  { title: "Karaoke Classics", category: "Music", difficulty: "Moderate" },
  { title: "Drum Circle Lite", category: "Music", difficulty: "Moderate" },
  { title: "Beading and Chat", category: "Creative Arts", difficulty: "Moderate" },
  { title: "Watercolor Postcards", category: "Creative Arts", difficulty: "Moderate" },
  { title: "Tablet Game Time", category: "Independent", difficulty: "Moderate" },
  { title: "Sensory Texture Trays", category: "Sensory", difficulty: "Easy" },
  { title: "Community Outing Planner", category: "Life Skills", difficulty: "Hard" },
  { title: "Chair Dance Party", category: "Fitness/Movement", difficulty: "Easy" },
  { title: "News Headline Match", category: "Cognitive", difficulty: "Moderate" },
  { title: "Song Lyric Fill-In", category: "Music", difficulty: "Moderate" },
  { title: "Cup Stack Challenge", category: "Games", difficulty: "Moderate" },
  { title: "Quote of the Day Chat", category: "Social", difficulty: "Easy" },
  { title: "Color Sorting Sprint", category: "Cognitive", difficulty: "Easy" },
  { title: "Life Story Timeline", category: "Reminiscence", difficulty: "Moderate" },
  { title: "Morning Mind Puzzles", category: "Cognitive", difficulty: "Moderate" },
  { title: "Walking Trivia Loop", category: "Fitness/Movement", difficulty: "Moderate" },
  { title: "Art Appreciation Hour", category: "Creative Arts", difficulty: "Easy" },
  { title: "Reminisce and Record", category: "Reminiscence", difficulty: "Moderate" },
  { title: "Cupcake Decorating Demo", category: "Social", difficulty: "Moderate" },
  { title: "Simple Sewing Circle", category: "Life Skills", difficulty: "Moderate" },
  { title: "Picture Prompt Writing", category: "Cognitive", difficulty: "Moderate" },
  { title: "Resident Choice Poll", category: "Social", difficulty: "Easy" }
];

const categoryPresets: Record<
  string,
  {
    supplies: string[];
    setupSteps: string[];
    checklistItems: string[];
  }
> = {
  Games: {
    supplies: ["Prompt cards", "Score sheet", "Pens", "Whiteboard", "Timer"],
    setupSteps: [
      "Arrange seats for clear visibility and easy turn-taking.",
      "Set out materials and review the rules in one-minute format.",
      "Run one practice round before starting scored rounds."
    ],
    checklistItems: [
      "Confirm materials are ready at each table.",
      "Review simple game rules and safety cues.",
      "Start with a warm-up round.",
      "Rotate turns so all residents can participate.",
      "Offer cueing support when needed.",
      "Track participation and score as applicable.",
      "Close with a short recap and encouragement."
    ]
  },
  Cognitive: {
    supplies: ["Large-print prompts", "Pencils", "Clipboards", "Whiteboard", "Answer key"],
    setupSteps: [
      "Prepare large-print materials and writing tools.",
      "Seat residents in small groups for conversation support.",
      "Start with simpler prompts before increasing challenge."
    ],
    checklistItems: [
      "Distribute materials and verify readability.",
      "Explain task with one clear example.",
      "Allow think time before giving hints.",
      "Offer verbal cueing and alternate response options.",
      "Encourage peer support and discussion.",
      "Capture completion and participation levels.",
      "Document resident response and interests."
    ]
  },
  Music: {
    supplies: ["Bluetooth speaker", "Playlist", "Large-print lyric cards", "Microphone optional", "Attendance sheet"],
    setupSteps: [
      "Build a playlist with familiar songs and varied tempo.",
      "Arrange seats for hearing access and clear sight lines.",
      "Test volume and opening cue before group begins."
    ],
    checklistItems: [
      "Confirm audio equipment and volume are set.",
      "Share the session plan and song order.",
      "Start with familiar warm-up selections.",
      "Invite requests and encourage participation.",
      "Offer breaks and hydration as needed.",
      "Track engagement level and mood.",
      "Close with resident favorite selection."
    ]
  },
  Social: {
    supplies: ["Prompt cards", "Large-print handouts", "Pens", "Whiteboard", "Attendance sheet"],
    setupSteps: [
      "Prepare discussion prompts suitable for resident interests.",
      "Arrange seating in a circle or small conversation pods.",
      "Set group expectations for respectful participation."
    ],
    checklistItems: [
      "Welcome residents and introduce session topic.",
      "Use one simple warm-up prompt to begin.",
      "Invite each resident to contribute in turn.",
      "Offer alternate nonverbal participation options.",
      "Guide conversation to keep tone supportive.",
      "Summarize key points and preferences shared.",
      "Document social interaction outcomes."
    ]
  },
  "Creative Arts": {
    supplies: ["Project materials", "Markers", "Glue sticks", "Scissors", "Table covers"],
    setupSteps: [
      "Set up stations with materials pre-sorted by seat.",
      "Demonstrate project steps with a simple sample.",
      "Provide adaptive options for grip and fine motor support."
    ],
    checklistItems: [
      "Cover tables and distribute supplies.",
      "Explain project goal in short steps.",
      "Assist with setup and tool handling as needed.",
      "Offer simplified design options.",
      "Encourage creativity and choice.",
      "Display or store finished work safely.",
      "Document participation and resident feedback."
    ]
  },
  "Fitness/Movement": {
    supplies: ["Stable chairs", "Water cups", "Cue cards", "Speaker optional", "Attendance sheet"],
    setupSteps: [
      "Arrange chairs with safe spacing and clear pathways.",
      "Review movement safety and no-pain guideline.",
      "Demonstrate warm-up and lower-intensity options."
    ],
    checklistItems: [
      "Verify resident readiness and mobility supports.",
      "Lead warm-up before core activity.",
      "Cue slow pacing and proper form.",
      "Offer seated alternatives during each segment.",
      "Provide hydration and rest break.",
      "End with cool-down movement.",
      "Document tolerance and engagement."
    ]
  },
  Wellness: {
    supplies: ["Calm music", "Comfort chairs", "Cue cards", "Hand sanitizer", "Attendance sheet"],
    setupSteps: [
      "Create a calm environment with reduced noise.",
      "Prepare comfort supports and seated options.",
      "Review consent and comfort stop signals."
    ],
    checklistItems: [
      "Confirm resident comfort and positioning.",
      "Introduce session objective and pacing.",
      "Lead activity in short guided segments.",
      "Observe and respond to fatigue cues.",
      "Offer breaks and supportive cueing.",
      "Close with grounding or relaxation prompt.",
      "Document mood and tolerance."
    ]
  },
  Reminiscence: {
    supplies: ["Photo or prompt cards", "Large-print labels", "Whiteboard", "Markers", "Notebook"],
    setupSteps: [
      "Prepare familiar-era prompts and visuals.",
      "Arrange seating for easy conversation.",
      "Start with a simple memory warm-up question."
    ],
    checklistItems: [
      "Share first prompt and allow quiet recall time.",
      "Invite voluntary memory sharing.",
      "Use follow-up prompts for details if welcomed.",
      "Validate responses without correction.",
      "Capture meaningful themes for future programming.",
      "Encourage peer-to-peer connection.",
      "Document resident participation and affect."
    ]
  },
  Independent: {
    supplies: ["Activity packets", "Pens", "Clipboards", "Label stickers", "Storage folders"],
    setupSteps: [
      "Prepare independent materials with clear instructions.",
      "Set up quiet work areas with support nearby.",
      "Offer optional check-ins during the session."
    ],
    checklistItems: [
      "Distribute materials and orientation instructions.",
      "Confirm each resident understands first step.",
      "Provide assistance on request only.",
      "Track time engaged independently.",
      "Offer modifications when tasks are too complex.",
      "Collect and store unfinished work.",
      "Document completion and preferences."
    ]
  },
  Sensory: {
    supplies: ["Sensory items", "Label cards", "Hand wipes", "Tray tables", "Attendance sheet"],
    setupSteps: [
      "Prepare sensory items with clear labeling.",
      "Screen for sensitivities before activity start.",
      "Introduce one sensory input at a time."
    ],
    checklistItems: [
      "Verify no active sensitivities or contraindications.",
      "Present items in low-stimulation order.",
      "Offer verbal choices and pacing breaks.",
      "Observe comfort and engagement response.",
      "Allow opt-out without pressure.",
      "Clean items between participants.",
      "Document preferred and non-preferred inputs."
    ]
  },
  "Life Skills": {
    supplies: ["Prompt cards", "Worksheet", "Pens", "Clipboard", "Demonstration materials"],
    setupSteps: [
      "Prepare practical prompts tied to daily routines.",
      "Set up materials in step-by-step sequence.",
      "Review safety and facility workflow reminders."
    ],
    checklistItems: [
      "Introduce practical goal for today's session.",
      "Demonstrate first step with clear cueing.",
      "Guide resident through each task segment.",
      "Offer adaptive supports as needed.",
      "Confirm understanding with simple teach-back.",
      "Summarize resident progress and preferences.",
      "Document outcomes for follow-up."
    ]
  }
};

function getAdaptations(title: string) {
  const base = {
    bedBound:
      "Offer a bedside version with simplified materials and shorter intervals to support comfort and focus.",
    dementiaFriendly:
      "Use one-step cues, familiar content, and repeated prompts while prioritizing reassurance and success.",
    lowVisionHearing:
      "Use large-print high-contrast materials, speak clearly, and reduce background noise for better access.",
    oneToOneMini:
      "Run a 10 to 15 minute one-to-one version with two or three core prompts and immediate encouragement."
  };

  if (/Parfait|Cupcake|Coffee/i.test(title)) {
    base.bedBound += " Use only food or beverage options approved by nursing and dietary per facility policy.";
  }
  if (/Massage|Nail/i.test(title)) {
    base.dementiaFriendly += " Any touch-based care products or nail support must follow facility policy and resident approval.";
  }
  if (/Aroma/i.test(title)) {
    base.lowVisionHearing += " Confirm scent use is approved per facility policy before starting.";
  }
  if (/Pet/i.test(title)) {
    base.oneToOneMini += " Use approved therapy-animal workflow and supervision per facility policy.";
  }
  if (/Outing/i.test(title)) {
    base.oneToOneMini += " Follow outing approvals, supervision, and documentation requirements per facility policy.";
  }

  return base;
}

function toTemplateRecord(def: TemplateDef) {
  const preset = categoryPresets[def.category] ?? categoryPresets.Social;
  const setupSteps = [`Introduce ${def.title} and today's objective.`].concat(preset.setupSteps);
  const checklistItems = preset.checklistItems.concat(`Document attendance and resident response for ${def.title}.`);

  return {
    title: def.title,
    category: def.category,
    difficulty: def.difficulty,
    supplies: preset.supplies.join(", "),
    setupSteps: setupSteps.join("\n"),
    adaptations: getAdaptations(def.title),
    defaultChecklist: checklistItems
  };
}

async function main() {
  const facilities = await prisma.facility.findMany({
    select: { id: true, name: true }
  });

  if (facilities.length === 0) {
    console.log("No facilities found. Create a facility first, then rerun this script.");
    return;
  }

  let totalInserted = 0;

  for (const facility of facilities) {
    const existing = await prisma.activityTemplate.findMany({
      where: {
        facilityId: facility.id,
        title: { in: templateDefs.map((template) => template.title) }
      },
      select: { title: true }
    });

    const existingTitles = new Set(existing.map((row) => row.title));
    const missing = templateDefs.filter((template) => !existingTitles.has(template.title));

    for (const template of missing) {
      const mapped = toTemplateRecord(template);
      await prisma.activityTemplate.create({
        data: {
          facilityId: facility.id,
          title: mapped.title,
          category: mapped.category,
          difficulty: mapped.difficulty,
          supplies: mapped.supplies,
          setupSteps: mapped.setupSteps,
          adaptations: mapped.adaptations,
          defaultChecklist: mapped.defaultChecklist
        }
      });
    }

    totalInserted += missing.length;
    console.log(`Facility "${facility.name}": inserted ${missing.length} template(s), skipped ${existing.length}.`);
  }

  console.log(`Done. Total inserted: ${totalInserted}.`);
}

main()
  .catch((error) => {
    console.error("Template import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
