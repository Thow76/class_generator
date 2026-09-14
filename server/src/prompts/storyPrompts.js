export const storyPromptVersion = "story-generate-v1";
export const storyRegenerateSentencePromptVersion = "story-regenerate-sentence-v1";
export const storyShortenSentencePromptVersion = "story-shorten-sentence-v1";

const levelRules = {
  "Literacies Plus": [
    "Prioritize this level first.",
    "Use concrete everyday contexts.",
    "Use very short sentences.",
    "Prefer high-frequency words.",
    "Use simple subject-verb-object patterns.",
    "Avoid idioms and abstract language.",
    "Avoid unnecessary pronouns if names are clearer.",
    "Use predictable rhythm and helpful repetition."
  ],
  "Complete Beginner": [
    "Use short, simple present-tense sentences.",
    "Keep vocabulary controlled.",
    "Use clear everyday actions.",
    "Avoid complex clauses.",
    "Avoid implied meaning that requires cultural inference."
  ],
  "Beginner 1": [
    "Use simple sentences with slightly more variety.",
    "Allow basic connectors when useful.",
    "Keep events easy to visualize.",
    "Keep vocabulary tied to the selected situation."
  ],
  "Beginner 1.5": [
    "Allow modest sentence variety.",
    "Use familiar connectors such as and, but and because sparingly.",
    "Keep the plot linear.",
    "Avoid dense grammar or long noun phrases."
  ],
  "Beginner 2": [
    "Allow somewhat richer sentences while staying accessible.",
    "Use practical everyday language.",
    "Keep the story grounded in the requested scenario.",
    "Avoid drifting into intermediate-level complexity."
  ]
};

export function buildStoryGenerationPrompt(lesson) {
  const mainCharacter = lesson.setup.mainCharacter;
  const secondaryCharacters = lesson.setup.secondaryCharacters;
  const rules = levelRules[lesson.learnerLevel] || [];

  return {
    promptVersion: storyPromptVersion,
    input: [
      {
        role: "system",
        content: [
          "You write editable ESOL story drafts for tutors.",
          "Use only the internal learner level named by the user.",
          "Do not include external proficiency labels such as A-one, A-two, B-one, or the European framework acronym.",
          "Return structured JSON only.",
          "Do not include Markdown, bullets, embedded numbering, headings, notes, or commentary.",
          "Each sentence text must be plain story text only."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Prompt version: ${storyPromptVersion}`,
          "",
          "Create a linear everyday story draft from this Setup data.",
          `Learner level: ${lesson.learnerLevel}`,
          `Theme: ${cleanText(lesson.theme)}`,
          `Setting: ${cleanText(lesson.setting)}`,
          `Scenario: ${cleanText(lesson.scenario)}`,
          `Sentence count: ${lesson.sentenceCount}`,
          `Main character name: ${cleanText(mainCharacter.name)}`,
          `Main character age or age range: ${cleanText(mainCharacter.age)}`,
          `Main character sex or gender: ${cleanText(mainCharacter.sex)}`,
          `Main character background or nationality: ${cleanText(mainCharacter.background)}`,
          `Secondary characters: ${
            secondaryCharacters.length > 0
              ? secondaryCharacters.map(cleanText).join(", ")
              : "None"
          }`,
          `Target vocabulary: ${cleanText(lesson.setup.targetVocabulary) || "None"}`,
          `Additional notes: ${cleanText(lesson.setup.additionalNotes) || "None"}`,
          "",
          "Level-specific rules:",
          ...rules.map((rule) => `- ${rule}`),
          "",
          "Output requirements:",
          `- Return exactly ${lesson.sentenceCount} sentence objects.`,
          "- Put the ordered sentence objects in the sentences array.",
          "- Use only the text field on each sentence object.",
          "- Do not put numbering inside sentence text.",
          "- Do not use Markdown.",
          "- Do not add unsupported fields."
        ].join("\n")
      }
    ]
  };
}

export function buildRegenerateSentencePrompt(lesson, sentence) {
  return buildSentenceOperationPrompt({
    lesson,
    sentence,
    promptVersion: storyRegenerateSentencePromptVersion,
    task: "Replace exactly one sentence in the current story.",
    operationRules: [
      "Return exactly one replacement sentence.",
      "Preserve the target sentence's story role in the full story.",
      "Preserve names, essential meaning and continuity.",
      "Improve clarity for the selected learner level.",
      "Do not rewrite, summarize or mention any other sentence."
    ]
  });
}

export function buildShortenSentencePrompt(lesson, sentence) {
  return buildSentenceOperationPrompt({
    lesson,
    sentence,
    promptVersion: storyShortenSentencePromptVersion,
    task: "Shorten exactly one sentence in the current story.",
    operationRules: [
      "Return exactly one shorter replacement sentence.",
      "Preserve core meaning, names, required vocabulary and essential action.",
      "Do not add new story events.",
      "Do not rewrite, summarize or mention any other sentence.",
      "If the current sentence is already very short, make the smallest useful simplification."
    ]
  });
}

function buildSentenceOperationPrompt({
  lesson,
  sentence,
  promptVersion,
  task,
  operationRules
}) {
  const rules = levelRules[lesson.learnerLevel] || [];

  return {
    promptVersion,
    input: [
      {
        role: "system",
        content: [
          "You edit one ESOL story sentence for a tutor.",
          "Use only the internal learner level named by the user.",
          "Do not include external proficiency labels such as A-one, A-two, B-one, or the European framework acronym.",
          "Return structured JSON only.",
          "Do not include Markdown, bullets, embedded numbering, headings, notes, alternatives, explanations or commentary.",
          "The sentence text must be plain story text only."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Prompt version: ${promptVersion}`,
          "",
          task,
          `Learner level: ${lesson.learnerLevel}`,
          `Theme: ${cleanText(lesson.theme)}`,
          `Setting: ${cleanText(lesson.setting)}`,
          `Scenario: ${cleanText(lesson.scenario)}`,
          `Main character name: ${cleanText(lesson.setup.mainCharacter.name)}`,
          `Main character age or age range: ${cleanText(lesson.setup.mainCharacter.age)}`,
          `Main character sex or gender: ${cleanText(lesson.setup.mainCharacter.sex)}`,
          `Main character background or nationality: ${cleanText(lesson.setup.mainCharacter.background)}`,
          `Secondary characters: ${
            lesson.setup.secondaryCharacters.length > 0
              ? lesson.setup.secondaryCharacters.map(cleanText).join(", ")
              : "None"
          }`,
          `Target vocabulary: ${cleanText(lesson.setup.targetVocabulary) || "None"}`,
          `Additional notes: ${cleanText(lesson.setup.additionalNotes) || "None"}`,
          "",
          "Current story in order:",
          ...lesson.story.sentences.map(
            (item, index) =>
              `${index + 1}. [${item.id}] ${cleanText(item.text)}`
          ),
          "",
          `Target sentence id: ${sentence.id}`,
          `Target sentence number: ${sentence.number}`,
          `Current target text: ${cleanText(sentence.text)}`,
          "",
          "Level-specific rules:",
          ...rules.map((rule) => `- ${rule}`),
          "",
          "Operation rules:",
          ...operationRules.map((rule) => `- ${rule}`),
          "",
          "Output requirements:",
          "- Return one object named sentence.",
          "- Use only the text field on the sentence object.",
          "- Do not put numbering inside sentence text.",
          "- Do not use Markdown.",
          "- Do not add unsupported fields."
        ].join("\n")
      }
    ]
  };
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
