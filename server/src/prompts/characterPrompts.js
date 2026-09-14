export const characterExtractionPromptVersion = "character-extract-v1";

export function buildCharacterExtractionPrompt(lesson) {
  const mainCharacter = lesson.setup.mainCharacter;
  const secondaryCharacters = lesson.setup.secondaryCharacters;

  return {
    promptVersion: characterExtractionPromptVersion,
    input: [
      {
        role: "system",
        content: [
          "You extract lightweight recurring human character records for ESOL lesson tutors.",
          "Use only information from the locked master story and Setup context.",
          "Return structured JSON only.",
          "Do not include Markdown, commentary, locations, animals, objects, organizations, generic crowds or one-off background people.",
          "Do not include visual/personality fields such as hair, clothing, build, expression, pose or visual style.",
          "Do not include external proficiency labels such as A-one, A-two, B-one, or the European framework acronym."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Prompt version: ${characterExtractionPromptVersion}`,
          "",
          "Extract recurring human characters required by this locked master story.",
          `Learner level: ${cleanText(lesson.learnerLevel)}`,
          `Theme: ${cleanText(lesson.theme)}`,
          `Title: ${cleanText(lesson.title) || "Untitled lesson"}`,
          `Setting: ${cleanText(lesson.setting)}`,
          `Scenario: ${cleanText(lesson.scenario)}`,
          `Setup main character name: ${cleanText(mainCharacter.name)}`,
          `Setup main character age or age range: ${cleanText(mainCharacter.age)}`,
          `Setup main character sex or gender: ${cleanText(mainCharacter.sex)}`,
          `Setup main character background or nationality: ${cleanText(mainCharacter.background)}`,
          `Setup secondary character tags: ${
            secondaryCharacters.length > 0
              ? secondaryCharacters.map(cleanText).join(", ")
              : "None"
          }`,
          `Target vocabulary: ${cleanText(lesson.setup.targetVocabulary) || "None"}`,
          `Additional notes: ${cleanText(lesson.setup.additionalNotes) || "None"}`,
          "",
          "Locked master story sentences:",
          ...lesson.story.lockedSentences.map(
            (sentence, index) =>
              `${index + 1}. [${sentence.id}] ${cleanText(sentence.text)}`
          ),
          "",
          "Extraction rules:",
          "- Include the Setup main character.",
          "- Include Setup secondary characters only when present in or clearly needed by the locked story.",
          "- Prefer named or role-named recurring humans over one-off people.",
          "- Avoid inventing unnecessary background characters.",
          "- Leave unknown age, sex or background empty, except use Unspecified for unknown sex.",
          "- Prefer broad age ranges when the story implies a life stage but not an exact age.",
          "- Do not generate character notes.",
          "- Do not generate appearance descriptions.",
          "- Character notes and appearance descriptions are tutor-controlled fields.",
          "- Use locked story sentence IDs only to ground which characters recur in the story.",
          "- Preserve the internal learner level label exactly if mentioned.",
          "- Do not use external proficiency labels.",
          "",
          "Output requirements:",
          "- Return one object with a characters array.",
          "- Use only name, role, age, sex, background, notes and storySentenceIds.",
          "- Return notes as an empty array.",
          "- Use role values main, secondary or supporting.",
          "- Use sex values Woman, Man, Non-binary or Unspecified.",
          "- storySentenceIds must reference the locked sentence ids above."
        ].join("\n")
      }
    ]
  };
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
