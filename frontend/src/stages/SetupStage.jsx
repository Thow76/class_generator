import { cloneElement } from "react";
import Icon from "../components/Icon.jsx";
import StageHeader from "../components/StageHeader.jsx";
import { learnerLevels, sentenceCounts, sexOptions } from "../data/constants.js";
import { getSetupFieldError } from "../utils/validateSetup.js";

function Field({ fieldId, label, error, onFieldBlur, children }) {
  const inputId = `setup-${fieldId.replaceAll(".", "-")}`;
  const errorId = `${inputId}-error`;
  const child = cloneElement(children, {
    id: inputId,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": error ? errorId : undefined,
    onBlur: (event) => {
      children.props.onBlur?.(event);
      onFieldBlur?.(fieldId);
    }
  });

  return (
    <label className={`field ${error ? "field--invalid" : ""}`} htmlFor={inputId}>
      <span>{label}</span>
      {child}
      {error ? (
        <span className="field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export default function SetupStage({
  lesson,
  newSecondaryCharacter,
  onSetupChange,
  onMainCharacterChange,
  onNewSecondaryCharacterChange,
  onAddSecondaryCharacter,
  onRemoveSecondaryCharacter,
  onSetupFieldBlur,
  setupErrors,
  showSetupValidation,
  onGenerateStory,
  storyGenerationStatus,
  storyGenerationError,
  isStoryMutationDisabled = false
}) {
  const { mainCharacter, secondaryCharacters } = lesson.setup;
  const getError = (fieldId) => getSetupFieldError(setupErrors, fieldId);
  const isGeneratingStory = storyGenerationStatus === "generating";

  return (
    <div className="stage stage--setup">
      <StageHeader step="Step 1 of 6 - Setup" title="New lesson">
        Describe the lesson you want. This becomes the starting point for a story,
        characters, scenes and media.
      </StageHeader>

      <section className="panel">
        <div className="panel__title">
          <Icon>menu_book</Icon>
          <h2>Lesson</h2>
        </div>
        <div className="form-grid form-grid--four">
          <Field
            fieldId="theme"
            label="Theme"
            error={getError("theme")}
            onFieldBlur={onSetupFieldBlur}
          >
            <input
              value={lesson.theme}
              onChange={(event) => onSetupChange("theme", event.target.value)}
              placeholder="Everyday services"
            />
          </Field>
          <Field
            fieldId="title"
            label="Lesson title"
            error={getError("title")}
            onFieldBlur={onSetupFieldBlur}
          >
            <input
              value={lesson.title}
              onChange={(event) => onSetupChange("title", event.target.value)}
              placeholder="Making an appointment"
            />
          </Field>
          <Field
            fieldId="learnerLevel"
            label="Learner level"
            error={getError("learnerLevel")}
            onFieldBlur={onSetupFieldBlur}
          >
            <select
              value={lesson.learnerLevel}
              onChange={(event) => onSetupChange("learnerLevel", event.target.value)}
            >
              {learnerLevels.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </Field>
          <Field
            fieldId="setting"
            label="Setting"
            error={getError("setting")}
            onFieldBlur={onSetupFieldBlur}
          >
            <input
              value={lesson.setting}
              onChange={(event) => onSetupChange("setting", event.target.value)}
              placeholder="A local service waiting room"
            />
          </Field>
        </div>
      </section>

      <section className="panel">
        <div className="panel__title">
          <Icon>route</Icon>
          <h2>Situation</h2>
        </div>
        <Field
          fieldId="scenario"
          label="Main situation / scenario"
          error={getError("scenario")}
          onFieldBlur={onSetupFieldBlur}
        >
          <textarea
            rows="3"
            value={lesson.scenario}
            onChange={(event) => onSetupChange("scenario", event.target.value)}
          />
        </Field>
      </section>

      <div className="stage-split">
        <section className="panel">
          <div className="panel__title">
            <Icon>groups</Icon>
            <h2>Characters</h2>
          </div>
          <div className="form-grid form-grid--two">
            <Field
              fieldId="setup.mainCharacter.name"
              label="Main character name"
              error={getError("setup.mainCharacter.name")}
              onFieldBlur={onSetupFieldBlur}
            >
              <input
                value={mainCharacter.name}
                onChange={(event) => onMainCharacterChange("name", event.target.value)}
                placeholder="Main character"
              />
            </Field>
            <Field
              fieldId="setup.mainCharacter.age"
              label="Approximate age"
              error={getError("setup.mainCharacter.age")}
              onFieldBlur={onSetupFieldBlur}
            >
              <input
                value={mainCharacter.age}
                onChange={(event) => onMainCharacterChange("age", event.target.value)}
                placeholder="34"
              />
            </Field>
            <Field
              fieldId="setup.mainCharacter.sex"
              label="Sex / gender"
              error={getError("setup.mainCharacter.sex")}
              onFieldBlur={onSetupFieldBlur}
            >
              <select
                value={mainCharacter.sex}
                onChange={(event) => onMainCharacterChange("sex", event.target.value)}
              >
                <option value="">Choose</option>
                {sexOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field
              fieldId="setup.mainCharacter.background"
              label="Background / nationality"
              error={getError("setup.mainCharacter.background")}
              onFieldBlur={onSetupFieldBlur}
            >
              <input
                value={mainCharacter.background}
                onChange={(event) =>
                  onMainCharacterChange("background", event.target.value)
                }
                placeholder="Background or nationality"
              />
            </Field>
          </div>

          <div className="tag-editor">
            <span className="field-label">Secondary characters</span>
            <div className="tag-list">
              {secondaryCharacters.map((character) => (
                <span className="tag" key={character}>
                  {character}
                  <button
                    aria-label={`Remove ${character}`}
                    type="button"
                    onClick={() => onRemoveSecondaryCharacter(character)}
                  >
                    <Icon>close</Icon>
                  </button>
                </span>
              ))}
            </div>
            <div className="inline-add">
              <input
                value={newSecondaryCharacter}
                onChange={(event) => onNewSecondaryCharacterChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onAddSecondaryCharacter();
                  }
                }}
                placeholder="e.g. Pharmacist"
              />
              <button
                className="icon-button"
                type="button"
                onClick={onAddSecondaryCharacter}
                aria-label="Add secondary character"
              >
                <Icon>add</Icon>
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel__title">
            <Icon>translate</Icon>
            <h2>Language</h2>
          </div>
          <Field
            fieldId="sentenceCount"
            label="Sentence count"
            error={getError("sentenceCount")}
            onFieldBlur={onSetupFieldBlur}
          >
            <select
              value={lesson.sentenceCount}
              onChange={(event) =>
                onSetupChange("sentenceCount", Number(event.target.value))
              }
            >
              {sentenceCounts.map((count) => (
                <option key={count}>{count}</option>
              ))}
            </select>
          </Field>
          <Field
            fieldId="setup.targetVocabulary"
            label="Target vocabulary"
            error={getError("setup.targetVocabulary")}
            onFieldBlur={onSetupFieldBlur}
          >
            <input
              value={lesson.setup.targetVocabulary}
              onChange={(event) => onSetupChange("targetVocabulary", event.target.value)}
              placeholder="appointment, directions, form"
            />
          </Field>
          <Field
            fieldId="setup.additionalNotes"
            label="Additional notes"
            error={getError("setup.additionalNotes")}
            onFieldBlur={onSetupFieldBlur}
          >
            <textarea
              rows="3"
              value={lesson.setup.additionalNotes}
              onChange={(event) => onSetupChange("additionalNotes", event.target.value)}
              placeholder="Keep sentences short. Avoid idioms."
            />
          </Field>
        </section>
      </div>

      <div className="stage-actions">
        {showSetupValidation && setupErrors.length > 0 ? (
          <span className="setup-validation-summary">
            Complete the required Setup fields before starting the story.
          </span>
        ) : null}
        {storyGenerationError ? (
          <span className="setup-validation-summary">{storyGenerationError}</span>
        ) : null}
        <button
          className="button button--primary"
          type="button"
          onClick={onGenerateStory}
          disabled={isGeneratingStory || isStoryMutationDisabled}
        >
          <Icon>auto_awesome</Icon>
          {isGeneratingStory ? "Generating story..." : "Generate story"}
        </button>
      </div>
    </div>
  );
}
