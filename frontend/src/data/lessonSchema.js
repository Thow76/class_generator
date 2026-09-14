/**
 * @typedef {Object} SetupCharacter
 * @property {string} name
 * @property {string} age
 * @property {string} sex
 * @property {string} background
 */

/**
 * @typedef {Object} SetupData
 * @property {SetupCharacter} mainCharacter
 * @property {string[]} secondaryCharacters
 * @property {string} targetVocabulary
 * @property {string} additionalNotes
 */

/**
 * @typedef {Object} StorySentence
 * @property {string} id Stable sentence identifier.
 * @property {number} number Display/order number.
 * @property {string} text Authoritative sentence text once locked.
 * @property {boolean} stale Whether this sentence may need review.
 * @property {"manual" | "generated" | "regenerated" | "shortened"} [source] How this sentence entered the story.
 * @property {string | null} [updatedAt] ISO timestamp for generated or edited text.
 */

/**
 * @typedef {Object} LockedStorySentence
 * @property {string} id Stable sentence identifier captured at lock time.
 * @property {number} number Display/order number captured at lock time.
 * @property {string} text Exact master sentence text captured at lock time.
 */

/**
 * @typedef {Object} Story
 * @property {"draft" | "locked"} status
 * @property {StorySentence[]} sentences
 * @property {string | null} lockedAt ISO timestamp for the latest lock.
 * @property {LockedStorySentence[]} lockedSentences Exact master story snapshot.
 * @property {boolean} modifiedAfterLock
 * @property {string | null} [lastGeneratedAt] ISO timestamp for the latest full story generation.
 * @property {Object | null} [generationMeta] Backend story generation metadata.
 */

/**
 * @typedef {Object} CharacterRecord
 * @property {string} id Stable character identifier.
 * @property {string} name
 * @property {"main" | "secondary" | "supporting"} role
 * @property {string} age
 * @property {string} sex
 * @property {string} background
 * @property {string} appearanceDescription Stable tutor-editable physical description used for character identity.
 * @property {string[]} notes
 * @property {"illustration" | "photorealistic"} [imageStyle] Preferred output style for generated character reference images.
 * @property {"not_started" | "generated" | "approved"} generationStatus
 * @property {number} generationCount Local placeholder generation counter.
 * @property {string | null} imagePath Placeholder for future generated media.
 * @property {boolean} approved
 * @property {boolean} stale
 * @property {string | null} [staleReason]
 * @property {string | null} [staleAt]
 */

/**
 * @typedef {Object} SceneRecord
 * @property {string} id Stable scene identifier.
 * @property {number} number Display/order number.
 * @property {string} label
 * @property {string[]} sentenceIds References into Story.sentences.
 * @property {string} location
 * @property {string} description
 * @property {string} visualDirection Scene-specific temporary visual guidance.
 * @property {string[]} characterIds References into Lesson.characters.
 * @property {"generate" | "reuse"} imageMode
 * @property {string | null} reuseSceneId
 * @property {"not_started" | "generated" | "approved"} generationStatus
 * @property {number} generationCount Local placeholder generation counter.
 * @property {string | null} imagePath Placeholder for future generated media.
 * @property {boolean} approved
 * @property {boolean} stale
 * @property {string | null} [staleReason]
 * @property {string | null} [staleAt]
 */

/**
 * @typedef {Object} ReusableValues
 * @property {string[]} backgrounds
 * @property {string[]} noteTags
 */

/**
 * @typedef {Object} MediaMetadata
 * @property {"All" | "Characters" | "Scenes"} filter
 * @property {Array} items Reserved for Phase 3+ metadata; Phase 2 derives visible cards.
 * @property {boolean} [stale]
 * @property {string | null} [staleReason]
 * @property {string | null} [staleAt]
 */

/**
 * @typedef {Object} ExportMetadata
 * @property {string | null} lastExportedAt
 * @property {string | null} lastExportPath
 * @property {boolean} [stale]
 * @property {string | null} [staleReason]
 * @property {string | null} [staleAt]
 */

/**
 * @typedef {Object} Lesson
 * @property {string} id
 * @property {string} theme
 * @property {string} title
 * @property {string} learnerLevel
 * @property {string} setting
 * @property {string} scenario
 * @property {number} sentenceCount
 * @property {SetupData} setup
 * @property {Story} story
 * @property {CharacterRecord[]} characters
 * @property {Object | null} [charactersMeta] Backend character extraction metadata.
 * @property {SceneRecord[]} scenes
 * @property {ReusableValues} reusable
 * @property {MediaMetadata} media
 * @property {ExportMetadata} export
 * @property {"setup" | "story" | "characters" | "scenes" | "media" | "export"} currentStage
 */

export const lessonStageIds = [
  "setup",
  "story",
  "characters",
  "scenes",
  "media",
  "export"
];
