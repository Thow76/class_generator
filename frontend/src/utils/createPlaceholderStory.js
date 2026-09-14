export function createPlaceholderStory(lesson) {
  const sentenceCount = Number(lesson.sentenceCount);
  const mainCharacterName = cleanText(lesson.setup.mainCharacter.name) || "The learner";
  const setting = cleanText(lesson.setting) || "the setting";
  const scenario = cleanText(lesson.scenario) || "the situation";
  const theme = cleanText(lesson.theme) || "the lesson theme";
  const vocabulary = cleanText(lesson.setup.targetVocabulary);
  const notes = cleanText(lesson.setup.additionalNotes);

  const sentenceTemplates = [
    `${mainCharacterName} is in ${setting}.`,
    `${mainCharacterName} needs help with ${theme}.`,
    `The situation is ${scenario}.`,
    `${mainCharacterName} asks a clear question.`,
    `Another person listens and gives simple information.`,
    `${mainCharacterName} checks what to do next.`,
    `They talk about the important details.`,
    `${mainCharacterName} feels ready to continue.`,
    `The task is finished in a calm way.`,
    vocabulary ? `The story can practise: ${vocabulary}.` : `${mainCharacterName} remembers the useful words.`,
    notes ? `The tutor note is: ${notes}.` : `The sentences stay short and clear.`,
    `${mainCharacterName} can use this language again.`
  ];

  return {
    ...lesson,
    story: {
      status: "draft",
      lockedAt: null,
      modifiedAfterLock: false,
      sentences: sentenceTemplates.slice(0, sentenceCount).map((text, index) => ({
        id: `sentence-${index + 1}`,
        number: index + 1,
        text,
        stale: false
      }))
    }
  };
}

export function shouldCreatePlaceholderStory(lesson) {
  return lesson.story.sentences.length !== Number(lesson.sentenceCount);
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
