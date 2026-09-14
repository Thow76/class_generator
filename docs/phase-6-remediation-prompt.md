# Phase 6 Remediation Prompt

Use this prompt to fix the remaining Phase 6 review findings for Lesson Source Builder.

## Prompt

You are remediating Milestone 2, Phase 6 of Lesson Source Builder.

Phase 6 is mostly implemented, but two correctness issues remain:

- Existing locked projects saved before `story.lockedSentences` existed can no longer be opened.
- Concurrent story sentence operations or edits can overwrite each other when full lesson responses return out of order.

Fix these issues only. Do not add Milestone 3 scope such as character extraction, scene planning, image generation, audio/video generation, ZIP export, cloud sync, accounts, Firebase, auth, PowerPoint generation or worksheet generation.

## Current Findings To Fix

### P1: Legacy Locked Projects Without Snapshots Are Unreadable

The new locked snapshot validation correctly requires `story.lockedSentences` for locked stories, but old local project files may have:

```json
{
  "story": {
    "status": "locked",
    "lockedAt": "2026-09-05T14:28:08.000Z",
    "sentences": [
      {
        "id": "sentence-1",
        "number": 1,
        "text": "Existing locked story text."
      }
    ]
  }
}
```

These lessons should still open, save and duplicate. A known affected project is:

```text
server/data/projects/lesson-20260905-142808-0f91d323/lesson.json
```

`getProject("lesson-20260905-142808-0f91d323")` currently fails with a 422 because normalization produces an empty `lockedSentences` array and validation rejects it.

Fix requirement:

- Preserve the locked snapshot invariant for all newly saved data.
- Add migration-safe normalization for legacy locked lessons.
- If a lesson is locked and `lockedSentences` is missing or empty while `story.sentences` is non-empty, derive `lockedSentences` from `story.sentences`.
- Derived snapshots must use the sentence id, array order number and exact text from `story.sentences`.
- Do not derive a snapshot when there are no story sentences.
- Do not silently accept an explicitly malformed non-empty snapshot. Non-empty snapshots with mismatched id, number, text or count should still fail validation.
- Apply equivalent behavior wherever saved projects are normalized for open/save/duplicate paths.

Recommended files:

```text
server/src/services/normalizeLesson.js
frontend/src/utils/normalizeLesson.js
server/src/services/validateLesson.js
frontend/src/utils/validateLessonShape.js
server/test/projectStore.test.js
```

### P2: Concurrent Sentence Operations Can Clobber Local Changes

The Story UI currently disables only the sentence card whose model operation is loading. `runSentenceOperation` saves the whole current lesson, sends a sentence operation request, then applies the full returned lesson. This allows clobber cases such as:

- Start regenerating sentence 1.
- Edit sentence 2 before sentence 1 returns.
- The returned full lesson was based on the older saved state and overwrites the sentence 2 edit.

Fix requirement:

- Prevent story text/model mutations while any sentence operation is in flight, or merge the returned sentence result into the current client lesson by sentence id.
- The safer minimum fix is to disable all story mutation controls during any sentence operation:
  - sentence text edits
  - add sentence
  - delete sentence
  - reorder sentence controls
  - regenerate sentence
  - shorten sentence
  - whole-story regenerate
  - lock/unlock story
  - Setup-stage Generate Story if it can trigger story generation while an operation is active
- The UI should still show which sentence operation is running.
- Save, open, duplicate and new lesson flows should continue to protect unsaved changes as before.
- If implementing merge instead of global disablement, merge only the changed sentence and relevant story/downstream metadata from the server response into the latest local lesson. Do not blindly replace the current full lesson with a stale response.

Recommended files:

```text
frontend/src/App.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/api/story.js
```

## Implementation Steps

1. Inspect current Phase 6 changes and confirm the two findings still reproduce.
2. Add a backend normalization migration for legacy locked lessons.
3. Add a matching frontend normalization migration for loaded project data.
4. Keep validator enforcement for locked stories with malformed non-empty snapshots.
5. Add or update server tests so a legacy locked project without `lockedSentences` opens successfully and receives a derived snapshot.
6. Add or update server tests so a locked project with a non-empty mismatched snapshot still fails validation.
7. Add frontend state that detects any in-flight sentence operation.
8. Use that state to disable all Story-stage mutation controls while a sentence operation is running.
9. Ensure Setup-stage Generate Story cannot start a competing story generation request while a sentence operation is running.
10. Preserve existing per-sentence loading and error display.
11. Run the existing verification commands.
12. Document the final behavior in a brief implementation note if the project already has Phase 6 documentation.

## Suggested Backend Migration Shape

Implement this in normalization before validation:

```js
function normalizeStory(story) {
  const hadLockedSentences = Array.isArray(story?.lockedSentences);
  const normalized = mergeLesson(DEFAULT_LESSON.story, isPlainObject(story) ? story : {});

  normalized.sentences = normalizeSentences(normalized.sentences);
  normalized.lockedSentences = normalizeLockedSentences(normalized.lockedSentences);

  if (
    normalized.status === "locked" &&
    normalized.sentences.length > 0 &&
    (!hadLockedSentences || normalized.lockedSentences.length === 0)
  ) {
    normalized.lockedSentences = normalized.sentences.map((sentence, index) => ({
      id: sentence.id,
      number: index + 1,
      text: sentence.text
    }));
  }

  return normalized;
}
```

Adjust to match the actual helper names and local style. The key point is to migrate absent or empty legacy snapshots from the current sentence array, while still rejecting mismatched non-empty snapshots.

## Suggested Frontend Safety Shape

In `App.jsx`, derive a boolean such as:

```js
const isSentenceOperationActive = Object.values(sentenceOperations).some(
  (operation) => operation.status === "loading"
);
```

Pass it into `StoryStage` and `SetupStage` as needed.

In `StoryStage`, combine it with existing disabled rules:

```js
const storyMutationDisabled = isLocked || isSentenceOperationActive;
```

Use this to disable edit, add, delete, reorder, regenerate, shorten, whole-story regenerate and lock/unlock controls as appropriate. Keep the currently-loading sentence indicator visible.

In `handleGenerateStory`, reject or ignore generation attempts while a sentence operation is active:

```js
if (isSentenceOperationActive) {
  setStoryGenerationStatus("error");
  setStoryGenerationError("Wait for the current story operation to finish.");
  return;
}
```

Prefer a quiet disabled button in the UI over letting the user click and then seeing an error.

## Acceptance Criteria

- Existing locked project files without `story.lockedSentences` can be opened.
- After opening one of those projects, the in-memory lesson has `lockedSentences` derived from `story.sentences`.
- Saving the migrated project writes a valid locked snapshot.
- Duplicating the migrated project works and preserves the derived snapshot.
- Locked projects with malformed non-empty `lockedSentences` are still rejected.
- Sentence regenerate and shorten still work for editable draft stories.
- While one sentence operation is in flight, the tutor cannot edit another sentence or launch another story mutation from the UI.
- Per-sentence loading and error states still show clearly.
- Whole-story regenerate confirmation still works after the operation guard.
- The existing `/api/story/generate` overwrite guard remains intact.
- Existing Phase 5 and Phase 6 tests pass.
- No Milestone 3+ scope is introduced.

## Regression Tests To Add Or Update

Add focused backend tests:

```text
server/test/projectStore.test.js
```

Cover:

- A locked lesson missing `lockedSentences` opens after normalization and receives a derived snapshot.
- A locked lesson with `lockedSentences: []` and non-empty `sentences` is migrated for legacy compatibility.
- A locked lesson with a non-empty mismatched snapshot is rejected.
- Duplicate works for a migrated locked lesson.

Add frontend tests if a frontend test runner exists. If not, perform manual UI verification and leave notes.

Manual UI checks:

- Start a sentence regenerate operation and confirm all other story mutation controls are disabled until it finishes.
- Start a sentence shorten operation and confirm sentence editing/add/delete/reorder controls are disabled until it finishes.
- Confirm the currently-running sentence still shows its loading state.
- Confirm Setup-stage Generate Story is unavailable or guarded while a sentence operation is active.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run build --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "confirmedOverwrite|Confirm overwrite before generating|lockedSentences|validateLockedSentenceSnapshot" frontend/src server/src server/test
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "characters/extract|scenes/plan|images/character|images/scene|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

If a local project server is needed for curl checks, start it with the existing dev command and stop it after verification.

## Handoff Notes

The goal is compatibility plus concurrency safety. Do not weaken the locked master story model. Instead, migrate legacy locked projects into the stricter model, then make the UI prevent stale full-lesson responses from overwriting newer story edits.

The best result is deliberately boring:

- Old locked projects open.
- New locked projects keep exact snapshots.
- Bad snapshots are rejected.
- One in-flight story operation cannot trample another local story change.
