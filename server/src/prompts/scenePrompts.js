export const scenePlanningPromptVersion = "scene-plan-v1";

export function buildScenePlanningPrompt(lesson) {
  const sentences = lesson.story.lockedSentences.map((sentence, index) => ({
    id: sentence.id,
    number: sentence.number || index + 1,
    text: sentence.text
  }));

  const approvedCharacters = lesson.characters
    .filter((character) => isRequiredCharacter(character) && isApprovedCharacter(character))
    .map((character) => ({
      id: character.id,
      name: character.name,
      role: character.role,
      age: character.age || "",
      sex: character.sex || "Unspecified",
      background: character.background || "",
      notes: Array.isArray(character.notes) ? character.notes : [],
      imageReferenceAvailable: Boolean(character.imagePath)
    }));

  const planningInput = {
    title: lesson.title || "",
    theme: lesson.theme || "",
    learnerLevel: lesson.learnerLevel || "",
    setting: lesson.setting || "",
    scenario: lesson.scenario || "",
    sentences,
    approvedCharacters
  };

  return {
    input: [
      {
        role: "system",
        content:
          "You plan editable visual scene records for Lesson Source Builder. Return only structured JSON that matches the schema. Group locked story sentences into sensible visual scene units, preferring one scene for a small run of related sentences instead of one image per sentence. Keep sentence order. Cover every locked story sentence exactly once. Use only the sentence IDs and approved character IDs provided. Include only characters who are present or visually relevant. Use the lesson setting and scenario for concise locations. Write short editable descriptions. Do not create new characters. Do not include image files, image URLs, image-generation prompts, camera, lens, rendering, shot, or style directions. Do not include external proficiency labels."
      },
      {
        role: "user",
        content: JSON.stringify(planningInput, null, 2)
      }
    ]
  };
}

function isRequiredCharacter(character) {
  return ["main", "secondary", "supporting"].includes(character?.role);
}

function isApprovedCharacter(character) {
  return (
    character?.approved === true &&
    character?.generationStatus === "approved" &&
    Boolean(character?.imagePath) &&
    character?.stale !== true
  );
}
