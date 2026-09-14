export const characterImagePromptVersion = "character-image-v3";

export function buildCharacterImagePrompt(lesson, character) {
  const imageStyle = normalizeCharacterImageStyle(character.imageStyle);
  const styleInstructions = getStyleInstructions(imageStyle);
  const appearanceDescription = cleanText(character.appearanceDescription);

  return [
    "Create one stable recurring human character reference portrait.",
    "Show the character as the clear single subject.",
    styleInstructions.style,
    styleInstructions.detail,
    "Use readable facial features and a plain neutral background.",
    "Do not include text, captions, watermarks, UI, logos or speech bubbles.",
    "Do not include extra named people.",
    "Do not depict a story scene or specific action.",
    "Do not add props.",
    "Do not add scene-specific clothing unless it is explicitly part of the appearance description.",
    "When details are not specified, keep the person natural and avoid over-specific invented traits.",
    "",
    `Prompt version: ${characterImagePromptVersion}`,
    `Requested image style: ${styleInstructions.label}`,
    "Project context: ESOL lesson character reference.",
    "",
    "Character record:",
    `Name: ${cleanText(character.name)}`,
    `Role: ${cleanText(character.role) || "supporting"}`,
    `Age or age range: ${cleanText(character.age) || "Not specified"}`,
    `Sex or gender: ${cleanText(character.sex) || "Unspecified"}`,
    `Background or nationality (lightweight context only): ${cleanText(character.background) || "Not specified"}`,
    `Stable appearance description: ${appearanceDescription || "Not specified"}`,
    "",
    "Composition:",
    "Plain neutral reference composition, waist-up or full body, centered on the person."
  ].join("\n");
}

export function normalizeCharacterImageStyle(value) {
  return value === "photorealistic" ? "photorealistic" : "illustration";
}

function getStyleInstructions(imageStyle) {
  if (imageStyle === "photorealistic") {
    return {
      label: "Photorealistic",
      style: "Use a natural photorealistic reference portrait style.",
      detail:
        "Make it look like a high-quality portrait photograph with realistic lighting and skin texture."
    };
  }

  return {
    label: "Illustration",
    style: "Use a consistent illustrated project style suitable for later scene images.",
    detail:
      "Use a simple realistic classroom-resource illustration look."
  };
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
