import { createEmptyLesson } from "./createLesson.js";

const sentences = [
  "Marta goes to the doctor's surgery.",
  "She speaks to the receptionist.",
  "The receptionist asks for Marta's name.",
  "Marta sits in the waiting room.",
  "The doctor calls Marta into the room.",
  "Marta says she has a sore throat.",
  "The doctor checks Marta and gives advice.",
  "Marta collects a prescription from reception.",
  "She books a follow-up appointment for next week."
].map((text, index) => ({
  id: `sentence-${index + 1}`,
  number: index + 1,
  text,
  stale: false
}));

export const demoLesson = createEmptyLesson({
  id: "phase-2-demo",
  theme: "Everyday health and services",
  title: "At the Doctor's Surgery",
  learnerLevel: "Literacies Plus",
  setting: "A local GP surgery waiting room",
  scenario:
    "Marta checks in at reception, waits, then describes her symptoms to the doctor and books a follow-up appointment.",
  sentenceCount: 9,
  setup: {
    mainCharacter: {
      name: "Marta",
      age: "34",
      sex: "Woman",
      background: "Polish"
    },
    secondaryCharacters: ["Receptionist", "Doctor"],
    targetVocabulary: "appointment, symptoms, receptionist, prescription",
    additionalNotes: "Keep sentences short. Avoid idioms."
  },
  story: {
    status: "draft",
    lockedAt: null,
    modifiedAfterLock: false,
    sentences
  },
  reusable: {
    backgrounds: ["Polish", "Scottish", "Pakistani", "Somali"],
    noteTags: [
      "same outfit each image",
      "clear face",
      "friendly",
      "adult learner context"
    ]
  },
  characters: [
    {
      id: "character-marta",
      name: "Marta",
      role: "main",
      age: "34",
      sex: "Woman",
      background: "Polish",
      appearanceDescription:
        "Woman in her mid 30s with shoulder-length dark brown hair, brown eyes, light skin and an average build.",
      notes: ["same outfit each image", "clear face"],
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    },
    {
      id: "character-receptionist",
      name: "Receptionist",
      role: "secondary",
      age: "40s",
      sex: "Unspecified",
      background: "Scottish",
      appearanceDescription:
        "Adult in their 40s with short fair hair, light skin and a welcoming face.",
      notes: ["friendly"],
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    },
    {
      id: "character-doctor",
      name: "Doctor",
      role: "secondary",
      age: "50s",
      sex: "Unspecified",
      background: "Pakistani",
      appearanceDescription:
        "Adult in their 50s with dark hair, medium-brown skin, glasses and an average build.",
      notes: ["professional"],
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    }
  ],
  scenes: [
    {
      id: "scene-1",
      number: 1,
      label: "Scene 1",
      sentenceIds: ["sentence-1", "sentence-2", "sentence-3"],
      location: "Reception desk",
      description: "",
      characterIds: ["character-marta", "character-receptionist"],
      imageMode: "generate",
      reuseSceneId: null,
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    },
    {
      id: "scene-2",
      number: 2,
      label: "Scene 2",
      sentenceIds: ["sentence-4", "sentence-5"],
      location: "Waiting room",
      description: "",
      characterIds: ["character-marta", "character-doctor"],
      imageMode: "generate",
      reuseSceneId: null,
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    },
    {
      id: "scene-3",
      number: 3,
      label: "Scene 3",
      sentenceIds: ["sentence-6", "sentence-7"],
      location: "Doctor's room",
      description: "",
      characterIds: ["character-marta", "character-doctor"],
      imageMode: "generate",
      reuseSceneId: null,
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    },
    {
      id: "scene-4",
      number: 4,
      label: "Scene 4",
      sentenceIds: ["sentence-8", "sentence-9"],
      location: "Reception desk",
      description: "",
      characterIds: ["character-marta", "character-receptionist"],
      imageMode: "reuse",
      reuseSceneId: "scene-1",
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    }
  ],
  media: {
    filter: "All",
    items: []
  },
  export: {
    lastExportedAt: null,
    lastExportPath: null
  },
  currentStage: "setup"
});
