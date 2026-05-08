const DEFAULT_NOTE_FORMAT = [
  "Title:",
  "Priority Level:",
  "Participation Level:",
  "Mood/Affect:",
  "Cues/Assistance:",
  "Response Type:",
  "",
  "Progress Note:",
  "",
  "Optional Follow-Up:"
].join("\n");

function detailsBlock(input: string) {
  return input.trim().length > 0 ? input.trim() : "[Paste details here]";
}

export function buildProgressNotePrompt(input = "") {
  return `Write a detailed, PCC-ready Activities progress note using only the details below.

Do not invent facts. Use this default Actify note format:
${DEFAULT_NOTE_FORMAT}

User details:
${detailsBlock(input)}`;
}

export function buildRewordProgressNotePrompt(input = "") {
  return `Reword this rough Activities progress note into professional, survey-ready, PCC-ready wording.

Preserve the exact meaning. Keep all important details. Do not invent facts. Keep the wording within the Activities Director role.

Note:
${detailsBlock(input)}`;
}

export function buildOneToOneNotePrompt(input = "") {
  return `Write a detailed 1:1 Activities note using the details below.

Include location, activity/intervention, resident response, mood/affect, cueing, participation level, and follow-up if supported by the provided details. Do not invent facts.

Use this default Actify note format:
${DEFAULT_NOTE_FORMAT}

Details:
${detailsBlock(input)}`;
}

export function buildRewordOneToOneNotePrompt(input = "") {
  return `Reword this rough 1:1 Activities note into professional, survey-ready, PCC-ready wording.

Preserve the exact meaning and do not invent facts. Keep the wording within the Activities Director role.

Note:
${detailsBlock(input)}`;
}

export function buildRefusalNotePrompt(input = "") {
  return `Write a respectful Activities refusal note using only the details below.

Include what was offered, resident response, encouragement if provided, alternatives if offered, resident preference if stated, and a short Activities follow-up if appropriate. Do not make the note punitive. Do not invent facts.

Details:
${detailsBlock(input)}`;
}

export function buildCarePlanPrompt(input = "") {
  return `Help me write Activities care plan wording for this resident using only the details below.

Keep the wording activity-focused. Include realistic goals/interventions, preferences, group/independent activity options, and 1:1 support if appropriate. Do not create nursing or clinical interventions.

Details:
${detailsBlock(input)}`;
}

export function buildUdaPrompt(input = "") {
  return `Help me write activity-focused UDA wording using only the details below.

Mention preferences, leisure interests, social patterns, participation, group activities, independent leisure, and 1:1 support when supported. Do not invent assessment findings.

Details:
${detailsBlock(input)}`;
}

export function buildMdsActivitySupportPrompt(input = "") {
  return `Help me write MDS-supportive Activities wording using only the details below.

Keep the wording activity-focused and professional. Mention preferences, leisure engagement, socialization, participation, and activity supports when supported. Do not invent clinical findings.

Details:
${detailsBlock(input)}`;
}

export function buildActivityIdeaPrompt(input = "") {
  return `Give me realistic Activities ideas for a skilled nursing setting using the details below.

Keep ideas practical, budget-conscious, resident-friendly, and easy to run. Include group, 1:1, dementia-friendly, sensory, bed-bound, or independent adaptations when helpful.

Details:
${detailsBlock(input)}`;
}

export function buildCalendarIdeasPrompt(input = "") {
  return `Help me plan realistic activity calendar ideas using the details below.

Include varied physical, cognitive, social, creative, spiritual, sensory, and independent options when appropriate. Keep the schedule manageable for a real Activities Director. Include backup options when useful.

Details:
${detailsBlock(input)}`;
}

export function buildResidentCouncilNotesPrompt(input = "") {
  return `Help me write concise, professional Resident Council notes using the details below.

Organize into old business, new business, concerns, compliments, and follow-up when supported. Use neutral, state-ready wording and do not sound accusatory.

Details:
${detailsBlock(input)}`;
}
