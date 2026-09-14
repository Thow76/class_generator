import Icon from "../components/Icon.jsx";
import StageHeader from "../components/StageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  characterImageStyleLabels,
  characterImageStyles,
  sexOptions
} from "../data/constants.js";
import { getProjectAssetUrl } from "../utils/lessonSelectors.js";

function statusLabel(character) {
  if (character.approved) return "Approved";
  if (character.generationStatus === "generated") return "Generated";
  return "Reference needed";
}

export default function CharactersStage({
  lesson,
  newBackground,
  newNotes,
  onCharacterChange,
  onCharacterBackgroundSelect,
  onNewBackgroundChange,
  onAddBackground,
  onNewNoteChange,
  onAddCharacterNote,
  onRemoveCharacterNote,
  onGenerateCharacter,
  onApproveCharacter,
  onUpdateAppearance,
  onExtractCharacters,
  characterExtractionStatus,
  characterExtractionError,
  characterAppearanceOperations = {},
  characterImageOperations = {},
  isCharacterExtractionDisabled
}) {
  const isStoryLocked = lesson.story.status === "locked";
  const isExtracting = characterExtractionStatus === "extracting";
  const isImageOperationActive = Object.values(characterImageOperations).some(
    (operation) => operation?.status === "loading"
  );
  const isAppearanceOperationActive = Object.values(characterAppearanceOperations).some(
    (operation) => operation?.status === "loading"
  );
  const extractDisabled = !isStoryLocked || isCharacterExtractionDisabled;

  return (
    <div className="stage stage--characters">
      <StageHeader step="Step 3 of 6 - Characters" title="Characters">
        Create lightweight reference records for each recurring character.
      </StageHeader>

      <section className="notice notice--compact" aria-live="polite">
        <Icon>{isStoryLocked ? "person_search" : "lock"}</Icon>
        <span>
          {isStoryLocked
            ? characterExtractionStatus === "success"
              ? "Characters extracted from the locked story."
              : "Extract editable character cards from the locked story."
            : "Lock the story before extracting characters."}
        </span>
        <div className="notice__actions">
          <button
            className="button button--primary"
            type="button"
            disabled={extractDisabled}
            onClick={onExtractCharacters}
          >
            <Icon>{isExtracting ? "hourglass_top" : "person_search"}</Icon>
            {isExtracting ? "Extracting characters..." : "Extract characters"}
          </button>
        </div>
      </section>

      {characterExtractionStatus === "error" ? (
        <div className="notice notice--warning" aria-live="polite">
          <Icon>warning</Icon>
          <span>{characterExtractionError || "Character extraction failed. Try again."}</span>
        </div>
      ) : null}

      <section className="panel panel--compact">
        <div className="panel__title">
          <Icon>public</Icon>
          <h2>Reusable backgrounds</h2>
        </div>
        <div className="tag-list">
          {lesson.reusable.backgrounds.map((background) => (
            <span className="tag tag--plain" key={background}>
              {background}
            </span>
          ))}
        </div>
        <div className="inline-add inline-add--short">
          <input
            value={newBackground}
            onChange={(event) => onNewBackgroundChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddBackground();
              }
            }}
            placeholder="Add background"
            disabled={isExtracting || isImageOperationActive || isAppearanceOperationActive}
          />
          <button
            className="icon-button"
            type="button"
            onClick={onAddBackground}
            disabled={isExtracting || isImageOperationActive || isAppearanceOperationActive}
            aria-label="Add background"
          >
            <Icon>add</Icon>
          </button>
        </div>
      </section>

      <div className="character-grid">
        {lesson.characters.map((character) => {
          const imageOperation = characterImageOperations[character.id];
          const appearanceOperation = characterAppearanceOperations[character.id];
          const isImageLoading = imageOperation?.status === "loading";
          const isAppearanceLoading = appearanceOperation?.status === "loading";
          const isCardDisabled =
            isExtracting ||
            isImageOperationActive ||
            isAppearanceOperationActive ||
            isCharacterExtractionDisabled;
          const imageUrl = getProjectAssetUrl(lesson.id, character.imagePath);
          const canApprove = Boolean(character.imagePath) && !character.stale;

          return (
            <article
              className={`asset-card ${
                character.approved ? "asset-card--approved" : ""
              }`}
              key={character.id}
            >
              <div className="asset-card__topline">
                <h2>{character.name || "Unnamed character"}</h2>
                <div className="asset-card__badges">
                  {character.stale ? (
                    <StatusBadge icon="warning" tone="warning">
                      Potentially stale
                    </StatusBadge>
                  ) : null}
                  <StatusBadge
                    icon={character.approved ? "check_circle" : "person"}
                    tone={character.approved ? "primary" : "neutral"}
                  >
                    {statusLabel(character)}
                  </StatusBadge>
                </div>
              </div>

              <div
                className={`asset-placeholder asset-placeholder--portrait asset-placeholder--${character.generationStatus}`}
                aria-busy={isImageLoading}
              >
                {imageUrl ? (
                  <img
                    className="asset-image asset-image--portrait"
                    src={imageUrl}
                    alt={`${character.name || "Character"} reference`}
                  />
                ) : (
                  <Icon>
                    {character.generationStatus === "not_started"
                      ? "person"
                      : "portrait"}
                  </Icon>
                )}
                <span>
                  {isImageLoading
                    ? imageOperation.operation === "approve"
                      ? "Approving reference..."
                      : "Generating reference..."
                    : character.generationStatus === "not_started"
                      ? "No generated reference"
                      : `Character reference ${character.generationCount || 1}`}
                </span>
              </div>

              {imageOperation?.status === "error" ? (
                <div className="notice notice--warning notice--inline" aria-live="polite">
                  <Icon>warning</Icon>
                  <span>{imageOperation.error || "Image request failed. Try again."}</span>
                </div>
              ) : null}

              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={character.name}
                    onChange={(event) =>
                      onCharacterChange(character.id, "name", event.target.value)
                    }
                    disabled={isCardDisabled}
                  />
                </label>
                <label className="field">
                  <span>Age / age range</span>
                  <input
                    value={character.age}
                    onChange={(event) =>
                      onCharacterChange(character.id, "age", event.target.value)
                    }
                    disabled={isCardDisabled}
                  />
                </label>
                <label className="field">
                  <span>Sex / gender</span>
                  <select
                    value={character.sex}
                    onChange={(event) =>
                      onCharacterChange(character.id, "sex", event.target.value)
                    }
                    disabled={isCardDisabled}
                  >
                    {sexOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Background / nationality</span>
                  <input
                    list={`background-options-${character.id}`}
                    value={character.background}
                    onChange={(event) =>
                      onCharacterBackgroundSelect(character.id, event.target.value)
                    }
                    disabled={isCardDisabled}
                  />
                </label>
                <label className="field">
                  <span>Image style</span>
                  <select
                    value={character.imageStyle || "illustration"}
                    onChange={(event) =>
                      onCharacterChange(character.id, "imageStyle", event.target.value)
                    }
                    disabled={isCardDisabled}
                  >
                    {characterImageStyles.map((style) => (
                      <option key={style} value={style}>
                        {characterImageStyleLabels[style]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field field--full character-appearance">
                  <span>Appearance description</span>
                  <textarea
                    rows={4}
                    value={character.appearanceDescription || ""}
                    onChange={(event) =>
                      onCharacterChange(
                        character.id,
                        "appearanceDescription",
                        event.target.value
                      )
                    }
                    placeholder="Shoulder-length dark hair, brown eyes, medium height, average build..."
                    disabled={isCardDisabled}
                  />
                  {onUpdateAppearance ? (
                    <div className="field-actions">
                      <button
                        className="button button--secondary"
                        type="button"
                        onClick={() => onUpdateAppearance(character.id)}
                        disabled={isCardDisabled || isAppearanceLoading}
                      >
                        <Icon>
                          {isAppearanceLoading ? "hourglass_top" : "auto_fix_high"}
                        </Icon>
                        {isAppearanceLoading
                          ? "Updating appearance..."
                          : "Update appearance"}
                      </button>
                    </div>
                  ) : null}
                  {appearanceOperation?.status === "error" ? (
                    <div
                      className="notice notice--warning notice--inline"
                      aria-live="polite"
                    >
                      <Icon>warning</Icon>
                      <span>
                        {appearanceOperation.error ||
                          "Appearance update failed. Try again."}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <datalist id={`background-options-${character.id}`}>
                {lesson.reusable.backgrounds.map((background) => (
                  <option key={background} value={background} />
                ))}
              </datalist>

              <details className="tag-editor tag-editor--secondary">
                <summary>Extra notes</summary>
                <div className="tag-list">
                  {character.notes.map((note) => (
                    <span className="tag" key={note}>
                      {note}
                      <button
                        type="button"
                        aria-label={`Remove ${note}`}
                        onClick={() => onRemoveCharacterNote(character.id, note)}
                        disabled={isCardDisabled}
                      >
                        <Icon>close</Icon>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="suggested-tags">
                  {lesson.reusable.noteTags
                    .filter((note) => !character.notes.includes(note))
                    .map((note) => (
                      <button
                        className="chip-button"
                        type="button"
                        key={note}
                        onClick={() => onAddCharacterNote(character.id, note)}
                        disabled={isCardDisabled}
                      >
                        <Icon>add</Icon>
                        {note}
                      </button>
                    ))}
                </div>
                <div className="inline-add">
                  <input
                    value={newNotes[character.id] || ""}
                    onChange={(event) =>
                      onNewNoteChange(character.id, event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onAddCharacterNote(character.id, newNotes[character.id]);
                      }
                    }}
                    placeholder="Add note"
                    disabled={isCardDisabled}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() =>
                      onAddCharacterNote(character.id, newNotes[character.id])
                    }
                    disabled={isCardDisabled}
                    aria-label={`Add note for ${character.name}`}
                  >
                    <Icon>add</Icon>
                  </button>
                </div>
              </details>

              <div className="card-actions">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => onGenerateCharacter(character.id)}
                  disabled={isCardDisabled}
                >
                  <Icon>{isImageLoading ? "hourglass_top" : "auto_awesome"}</Icon>
                  {isImageLoading
                    ? "Working..."
                    : character.imagePath
                      ? "Regenerate"
                      : "Generate character"}
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  disabled={isCardDisabled || !canApprove}
                  onClick={() => onApproveCharacter(character.id)}
                >
                  <Icon>check</Icon>
                  Use this character
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
