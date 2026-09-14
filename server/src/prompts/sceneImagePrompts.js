import { normalizeCharacterImageStyle } from "./characterImagePrompts.js";

export const sceneImagePromptVersion = "scene-image-v3";

export function buildSceneImagePrompt(lesson, scene) {
  const sentenceMap = new Map(
    lesson.story.lockedSentences.map((sentence, index) => [
      sentence.id,
      { ...sentence, displayNumber: index + 1 }
    ])
  );
  const characterMap = new Map(
    lesson.characters.map((character) => [character.id, character])
  );
  const sceneCharacters = scene.characterIds
    .map((characterId) => characterMap.get(characterId))
    .filter(Boolean);
  const imageStyles = new Set(
    sceneCharacters.map((character) => normalizeCharacterImageStyle(character.imageStyle))
  );

  if (imageStyles.size > 1) {
    throw new Error("Scene characters use mixed image styles.");
  }

  const imageStyle = [...imageStyles][0] || "illustration";
  const coveredSentences = scene.sentenceIds
    .map((sentenceId) => sentenceMap.get(sentenceId))
    .filter(Boolean)
    .map((sentence) => `${sentence.displayNumber}. ${cleanText(sentence.text)}`)
    .join("\n");
  const characterDetails = sceneCharacters.map(formatCharacter).join("\n\n");

  return [
    "Create one scene image for ESOL teaching material.",
    "Depict the planned story scene, not a character portrait.",
    styleInstruction(imageStyle),
    "Preserve each listed character's stable physical identity from the approved reference image and appearance description.",
    "Do not change hair, facial features, age presentation, body type or other stable identity traits unless the scene description explicitly requires a temporary visible change.",
    "Use scene location, scene description and locked story sentences for this scene's action and context.",
    "Use visual direction only for temporary scene-specific clothing, expression, pose, props, placement and composition.",
    "Do not use visual direction to permanently change a character's stable identity.",
    "Include only the listed characters unless the scene description clearly needs anonymous background people.",
    "Anonymous background people must stay secondary and must not become named or recurring characters.",
    "Do not invent named characters.",
    "Avoid text, captions, watermarks, UI, logos and speech bubbles.",
    "Use clear, readable teaching-resource composition rather than dramatic cinematic framing.",
    "",
    `Prompt version: ${sceneImagePromptVersion}`,
    `Requested image style: ${imageStyle === "photorealistic" ? "Photorealistic" : "Illustration"}`,
    `Broad lesson setting context only: ${cleanText(lesson.setting) || "Not specified"}`,
    "",
    "Locked story sentences covered by this scene:",
    "Use these sentences only to understand this scene's action. Do not use them to change stable character appearance.",
    coveredSentences,
    "",
    "Scene record:",
    `Label: ${cleanText(scene.label) || `Scene ${scene.number || ""}`.trim()}`,
    `Location: ${cleanText(scene.location)}`,
    `Description: ${cleanText(scene.description)}`,
    `Scene-specific visual direction: ${cleanText(scene.visualDirection) || "Not specified"}`,
    "",
    "Approved character references:",
    characterDetails || "No named characters listed."
  ].join("\n");
}

function formatCharacter(character) {
  const appearanceDescription = cleanText(character.appearanceDescription);

  return [
    `ID: ${character.id}`,
    `Name: ${cleanText(character.name)}`,
    `Role: ${cleanText(character.role) || "supporting"}`,
    `Age or age range: ${cleanText(character.age) || "Not specified"}`,
    `Sex or gender: ${cleanText(character.sex) || "Unspecified"}`,
    `Background or nationality: ${cleanText(character.background) || "Not specified"}`,
    `Stable appearance description: ${appearanceDescription || "Not specified"}`,
    `Image style: ${normalizeCharacterImageStyle(character.imageStyle)}`,
    `Approved image path: ${cleanText(character.imagePath) || "Not specified"}`
  ].join("\n");
}

function styleInstruction(imageStyle) {
  if (imageStyle === "photorealistic") {
    return "Use a photorealistic classroom-resource style with natural lighting and realistic people.";
  }

  return "Use a consistent illustrated classroom-resource style with warm, realistic detail.";
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
