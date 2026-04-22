export interface FieldTooltipEntry {
  fieldKey: string
  label: string
  short: string
  detail: string
  relatedFields: string[]
  sourceGuide: string
}

/**
 * Tooltip data for every student profile field, extracted from the
 * student-profile-field-guide.md (sections 1-4). Tooltips are in English
 * (matching UI chrome language). Only fields currently rendered in the
 * StudentForm get a visible tooltip; the rest are here for future use
 * (e.g. embedded chat agent).
 */
export const fieldTooltips: Record<string, FieldTooltipEntry> = {
  // Section 1: Identity
  name: {
    fieldKey: 'name',
    label: 'Name',
    short: 'The name you use to refer to this student in class.',
    detail: 'This is the everyday name, not the legal name. Billing names belong in a future billing phase.',
    relatedFields: [],
    sourceGuide: 'student-profile-field-guide.md \u00A71 Name',
  },
  birthYear: {
    fieldKey: 'birthYear',
    label: 'Birth Year',
    short: 'Year of birth (4 digits). Age affects tone, materials, and pacing.',
    detail: 'Age is calculated from the year so you never need to update it. A 16-year-old student and a 45-year-old engineer need very different approaches.',
    relatedFields: ['profession'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 BirthYear',
  },
  profession: {
    fieldKey: 'profession',
    label: 'Profession',
    short: 'What the student does for a living. Drives content personalization.',
    detail: 'A ship captain needs port vocabulary; a lawyer needs formal register. This anchors which topics and registers to prioritize in generated content.',
    relatedFields: ['reasonForStudying', 'learningGoals'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 Profession',
  },
  countryOfOrigin: {
    fieldKey: 'countryOfOrigin',
    label: 'Country of Origin',
    short: 'The country the student comes from culturally.',
    detail: 'Informs cultural references they will understand and L1 interference patterns. Not legal nationality.',
    relatedFields: ['cityOfOrigin', 'nativeLanguages'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 CountryOfOrigin',
  },
  cityOfOrigin: {
    fieldKey: 'cityOfOrigin',
    label: 'City of Origin',
    short: 'City or region of origin, if known.',
    detail: 'Useful for local cultural references. Distinct from current city of residence.',
    relatedFields: ['countryOfOrigin'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 CityOfOrigin',
  },
  countryOfResidence: {
    fieldKey: 'countryOfResidence',
    label: 'Country of Residence',
    short: 'Where the student currently lives. Affects immersion context.',
    detail: 'A student living in Spain gets daily practice outside class; one in the Netherlands does not. This changes the course pace.',
    relatedFields: ['cityOfResidence', 'countryOfOrigin'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 CountryOfResidence',
  },
  cityOfResidence: {
    fieldKey: 'cityOfResidence',
    label: 'City of Residence',
    short: 'Current city. Enables location-specific materials.',
    detail: 'When a student lives in Spain, you can use real local references (e.g. "imagine going to the Boqueria market").',
    relatedFields: ['countryOfResidence'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 CityOfResidence',
  },
  nativeLanguages: {
    fieldKey: 'nativeLanguages',
    label: 'Native Languages',
    short: 'The languages the student grew up speaking. Drives L1 interference analysis.',
    detail: 'Many students are bilingual from birth (Dutch + Frisian, Catalan + Spanish). Knowing all native languages helps predict error patterns and choose teaching strategies. This is not for languages learned later (those go in Spoken Languages).',
    relatedFields: ['spokenLanguages', 'countryOfOrigin'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 NativeLanguages',
  },
  spokenLanguages: {
    fieldKey: 'spokenLanguages',
    label: 'Spoken Languages',
    short: 'Other languages the student speaks, besides native and target.',
    detail: 'A student who already speaks three languages approaches the fourth differently. You can leverage cognates and grammatical comparisons across known languages.',
    relatedFields: ['nativeLanguages'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 SpokenLanguages',
  },
  reasonForStudying: {
    fieldKey: 'reasonForStudying',
    label: 'Reason for Studying',
    short: 'Why this student is learning the language. The anchor of the course.',
    detail: '"Ordering a beer in Barcelona" and "presenting reports to a Spanish boss" are entirely different courses. When choosing between materials, come back to this field.',
    relatedFields: ['learningGoals', 'shortTermObjectives'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 ReasonForStudying',
  },
  personalNotes: {
    fieldKey: 'personalNotes',
    label: 'Personal Notes',
    short: 'What you need to know about the student as a person, not as a learner.',
    detail: 'Sensitivities, life situation, things to avoid. Separated from teaching notes so each type stays clean. Not for pedagogical observations (those go in Teaching Notes or Difficulties).',
    relatedFields: ['teachingNotes'],
    sourceGuide: 'student-profile-field-guide.md \u00A71 PersonalNotes',
  },

  // Section 2: Level
  learningLanguage: {
    fieldKey: 'learningLanguage',
    label: 'Learning Language',
    short: 'The language this student is learning with you.',
    detail: 'All content generation depends on this field. This is the target language, not the student\'s language or yours.',
    relatedFields: ['cefrLevel'],
    sourceGuide: 'student-profile-field-guide.md \u00A72 LearningLanguage',
  },
  cefrLevel: {
    fieldKey: 'cefrLevel',
    label: 'CEFR Level',
    short: 'The level YOU believe the student is at, based on your assessment.',
    detail: 'This drives all content generation. It can differ from the official level (Official CEFR Level), which is just for reference. Your professional judgment is what guides the class.',
    relatedFields: ['officialCefrLevel', 'skillLevelOverrides', 'difficulties'],
    sourceGuide: 'student-profile-field-guide.md \u00A72 CefrLevel',
  },
  officialCefrLevel: {
    fieldKey: 'officialCefrLevel',
    label: 'Official CEFR Level',
    short: 'The level from the student\'s last recognized exam or placement test.',
    detail: 'Most students won\'t have one. Useful to show where they started, justify level choices, and detect misalignment with your own assessment. Does NOT drive content generation.',
    relatedFields: ['cefrLevel'],
    sourceGuide: 'student-profile-field-guide.md \u00A72 OfficialCefrLevel',
  },
  skillLevelOverrides: {
    fieldKey: 'skillLevelOverrides',
    label: 'Skill Level Overrides',
    short: 'Exceptions by skill when the global CEFR level hides real differences.',
    detail: 'A B1 student might comprehend at B2 but write at A2. Students with years of passive exposure (TV, reading) understand more than they produce. This snapshot of misalignment feeds per-skill content generation.',
    relatedFields: ['cefrLevel', 'difficulties'],
    sourceGuide: 'student-profile-field-guide.md \u00A72 SkillLevelOverrides',
  },
  difficulties: {
    fieldKey: 'difficulties',
    label: 'Specific Difficulties',
    short: 'Structured list of concrete issues: competency, subcategory, severity, trend.',
    detail: '"Struggles with subjunctive" is too vague. Structuring difficulties (grammar/ser-estar/high/stable) enables targeted exercises, progress tracking, and knowing when an issue has been covered in class.',
    relatedFields: ['cefrLevel', 'weaknesses', 'teachingTodos'],
    sourceGuide: 'student-profile-field-guide.md \u00A72 Difficulties',
  },

  // Section 3: The Plan
  learningGoals: {
    fieldKey: 'learningGoals',
    label: 'Learning Goals',
    short: 'The learning objectives that direct this student\'s course.',
    detail: 'Operational goals like "hold a 10-minute conversation without blocking" are useful. "Learn Spanish" is not a goal, it is a wish. Not for short-term deadlines (use Short-Term Objectives) or concrete issues (use Difficulties).',
    relatedFields: ['shortTermObjectives', 'reasonForStudying'],
    sourceGuide: 'student-profile-field-guide.md \u00A73 LearningGoals',
  },
  shortTermObjectives: {
    fieldKey: 'shortTermObjectives',
    label: 'Short-Term Objectives',
    short: 'Time-bound commitments (exams, trips, meetings) that reshape the course plan.',
    detail: 'If a DELE exam is in 6 weeks, the next classes must revolve around it regardless of the normal program. A student can have multiple at once. These feed content generation with high priority when the deadline is near.',
    relatedFields: ['learningGoals', 'reasonForStudying'],
    sourceGuide: 'student-profile-field-guide.md \u00A73 ShortTermObjectives',
  },
  teachingTodos: {
    fieldKey: 'teachingTodos',
    label: 'Teaching Todos',
    short: 'Ideas for future classes that accumulate over time without getting buried.',
    detail: 'Things that come up during a session ("I need to work on articles with this student") but live on the student profile so they don\'t disappear when new sessions are added. Different from Difficulties (what the student struggles with) and session topics (what to cover next time).',
    relatedFields: ['difficulties', 'teachingNotes'],
    sourceGuide: 'student-profile-field-guide.md \u00A73 TeachingTodos',
  },
  teachingNotes: {
    fieldKey: 'teachingNotes',
    label: 'Teaching Notes',
    short: 'How this student learns: what works in class, teaching observations.',
    detail: 'General pedagogical observations that don\'t fit in a structured Difficulty or a specific Teaching Todo. "Prefers inductive explanations", "Needs a long warm-up", "Responds well to humor". The complement of Personal Notes: one is who they are, this is how to teach them.',
    relatedFields: ['personalNotes', 'difficulties', 'teachingTodos'],
    sourceGuide: 'student-profile-field-guide.md \u00A73 TeachingNotes',
  },

  // Section 4: Commercial
  isActive: {
    fieldKey: 'isActive',
    label: 'Active',
    short: 'Whether this student is currently taking classes.',
    detail: 'Inactive students are archived from the active list but their history is preserved. Use for students on break, finished, or who left the platform.',
    relatedFields: [],
    sourceGuide: 'student-profile-field-guide.md \u00A74 IsActive',
  },
  isCorporate: {
    fieldKey: 'isCorporate',
    label: 'Corporate',
    short: 'Whether the student\'s classes are paid by their employer.',
    detail: 'Corporate students often have less intrinsic motivation, stricter schedules, and sometimes require periodic reports to HR. Useful for grouping and potentially different billing rates.',
    relatedFields: ['rate'],
    sourceGuide: 'student-profile-field-guide.md \u00A74 IsCorporate',
  },
  rate: {
    fieldKey: 'rate',
    label: 'Rate',
    short: 'Your fee with this student, in your own words.',
    detail: 'Free-text because rates vary (hourly, monthly, corporate, exchanges). Not for billing or accounting. When filled, the app will suggest previously used values for quick entry.',
    relatedFields: ['isCorporate'],
    sourceGuide: 'student-profile-field-guide.md \u00A74 Rate',
  },

  // Legacy/alias fields
  weaknesses: {
    fieldKey: 'weaknesses',
    label: 'Areas to Improve',
    short: 'Free-text descriptions of areas to improve, with category.',
    detail: 'Simpler than Specific Difficulties. Each entry is a description plus a type (grammatical, lexical, orthographic). For more structured tracking with severity and trend, use Specific Difficulties instead.',
    relatedFields: ['difficulties'],
    sourceGuide: 'student-profile-field-guide.md \u00A72 (related to Difficulties)',
  },
  interests: {
    fieldKey: 'interests',
    label: 'Interests',
    short: 'Topics the student enjoys, used to personalize lesson content.',
    detail: 'Cooking, football, travel, technology. These feed into content generation so exercises and reading materials feel relevant to the student.',
    relatedFields: ['profession', 'reasonForStudying'],
    sourceGuide: 'student-profile-field-guide.md (implicit, used in content generation)',
  },
}

/** Look up a tooltip entry by field key. Returns undefined if not found. */
export function getFieldTooltip(fieldKey: string): FieldTooltipEntry | undefined {
  return Object.prototype.hasOwnProperty.call(fieldTooltips, fieldKey)
    ? fieldTooltips[fieldKey]
    : undefined
}
