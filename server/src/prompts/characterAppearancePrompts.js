export const characterAppearancePromptVersion = "character-appearance-v1";

export function buildCharacterAppearancePrompt(lesson, character) {
  return {
    promptVersion: characterAppearancePromptVersion,
    input: [
      {
        role: "system",
        content: [
          "You draft concise physical identity descriptions for recurring ESOL lesson characters.",
          "Use only the locked story and character basics as context.",
          "Return structured JSON only.",
          "Describe stable physical appearance only.",
          "Avoid temporary scene details, actions, locations, props, clothing that can change, education metadata, personality labels, and image-control instructions.",
          "Do not infer sensitive traits beyond what the tutor or setup already states."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Prompt version: ${characterAppearancePromptVersion}`,
          "",
          "Write a stable physical appearance description for this recurring lesson character.",
          "Describe only physical identity that can remain consistent across scenes.",
          "Use one plain sentence or two short sentences.",
          "Keep it concise and editable.",
          "Do not mention course metadata, story context, classroom context, image generation, or prompt.",
          "Do not include bullets, labels, Markdown, JSON fragments, or commentary.",
          "Do not include domain-specific lesson words unless they are genuinely physical traits.",
          "Avoid clothing unless it is a permanent defining feature.",
          "",
          "Character basics:",
          `Name: ${cleanText(character.name)}`,
          `Role: ${cleanText(character.role)}`,
          `Age or age range: ${cleanText(character.age) || "Unknown"}`,
          `Sex or gender: ${cleanText(character.sex) || "Unspecified"}`,
          `Background or nationality, optional context only: ${
            cleanText(character.background) || "Unknown"
          }`,
          `Existing appearance description: ${
            cleanText(character.appearanceDescription) || "None"
          }`,
          "",
          "Weak lesson context:",
          `Setting: ${cleanText(lesson.setting) || "None"}`,
          `Scenario: ${cleanText(lesson.scenario) || "None"}`,
          "",
          "Locked story sentences for recurring-character context only:",
          ...lesson.story.lockedSentences.map(
            (sentence, index) =>
              `${index + 1}. [${sentence.id}] ${cleanText(sentence.text)}`
          ),
          "",
          "Output requirements:",
          "- Return one object with appearanceDescription.",
          "- appearanceDescription must be stable physical appearance only.",
          "- Do not mention the character's name unless it sounds natural.",
          "- Do not update notes, image style, scenes, or images."
        ].join("\n")
      }
    ]
  };
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
