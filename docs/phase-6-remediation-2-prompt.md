# Phase 6 Remediation 2 Prompt

Use this prompt to fix the remaining Phase 6 project-switching race in Lesson Source Builder.

## Prompt

You are remediating a remaining Milestone 2, Phase 6 issue in Lesson Source Builder.

Previous remediation fixed legacy locked project migration and disabled Story-stage mutation controls during sentence operations. One race remains: project-level actions are still available while a sentence operation is in flight.

Fix this issue only. Do not add Milestone 3 scope such as character extraction, scene planning, image generation, audio/video generation, ZIP export, accounts, Firebase, auth, cloud sync, PowerPoint generation or worksheet generation.

## Finding To Fix

### P2: Project Switching Is Still Possible While A Sentence Operation Is In Flight

During `runSentenceOperation`, the frontend:

1. Saves the current lesson.
2. Sends a backend sentence operation request.
3. Waits for the backend.
4. Applies the returned full lesson.

While that request is in flight, sidebar project actions such as New, Open and Duplicate are still enabled because `Sidebar.jsx` only disables them for loading/saving states. If the user creates, opens or duplicates another project before the operation returns, the old operation response can unexpectedly switch the UI back to the previous lesson.

Known review references:

```text
frontend/src/App.jsx
frontend/src/components/Sidebar.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/SetupStage.jsx
```

The app already has or should have an `isSentenceOperationActive` boolean. Use it to protect project-level actions too.

## Required Behavior

- While any sentence operation is loading, the user cannot trigger:
  - New Lesson
  - Open Lesson panel
  - Opening a saved lesson from the project list
  - Duplicate Lesson
  - Pending project action confirmation that would switch or duplicate projects
- The Save button may remain available only if it cannot cause stale operation responses to clobber current state. Prefer disabling Save too during the operation unless there is a clear reason to keep it enabled.
- The UI should explain the temporary disabled state with existing status/error patterns or accessible button titles if the design already uses them.
- Story-stage mutation controls must remain disabled during sentence operations.
- Setup Generate Story must remain guarded during sentence operations.
- Existing unsaved-change confirmations should continue to work after the operation completes.
- The sentence operation loading/error indicator should remain visible on the active sentence.
- The old sentence operation response must not be able to replace a different active project.

## Strongly Recommended Safety Belt

In addition to disabling project controls, guard the async response path in `runSentenceOperation`.

Capture the project id and an operation token before awaiting the backend:

```js
const operationProjectId = activeProjectId;
const operationToken = Symbol("sentence-operation");
```

Use a `useRef` or equivalent to track the current operation token. After the backend returns, apply the server lesson only if:

- the operation token is still current; and
- the active project id still matches the project id used for the operation.

If either check fails:

- do not call `applyServerLesson`;
- clear only the stale operation state if it still belongs to that operation; and
- do not switch the UI back to the old lesson.

This guard makes the implementation resilient even if a future UI path accidentally re-enables project switching.

## Suggested Frontend Shape

In `App.jsx`, derive or reuse:

```js
const isSentenceOperationActive = useMemo(
  () =>
    Object.values(sentenceOperations).some(
      (operation) => operation?.status === "loading"
    ),
  [sentenceOperations]
);
```

Pass it into `projectControls`:

```js
const projectControls = {
  // existing fields
  isProjectActionDisabled: isSentenceOperationActive
};
```

Then guard project actions:

```js
async function requestNewLesson() {
  if (isSentenceOperationActive) {
    setProjectError("Wait for the current story operation to finish.");
    return;
  }
  // existing behavior
}
```

Apply the same guard to:

```text
requestOpenProjectPanel
requestDuplicateProject
confirmPendingProjectAction
openProject
duplicateCurrentProject
createFreshProject
```

Choose the exact function list based on the current implementation. The important part is that no project-switching or duplication path can start during an active sentence operation.

In `Sidebar.jsx`, combine the disabled rules:

```js
const projectActionDisabled =
  projectControls.loadStatus === "loading" ||
  projectControls.saveStatus === "saving" ||
  projectControls.isProjectActionDisabled;
```

Use that rule for New, Open, Duplicate, project-list selection and any project action that changes the active lesson.

## Acceptance Criteria

- New Lesson is disabled or guarded while a sentence operation is in flight.
- Open Lesson is disabled or guarded while a sentence operation is in flight.
- Selecting a saved project is disabled or guarded while a sentence operation is in flight.
- Duplicate Lesson is disabled or guarded while a sentence operation is in flight.
- Pending project action confirmation cannot switch or duplicate projects while a sentence operation is in flight.
- A returned sentence operation response cannot switch the UI back to a project that is no longer active.
- Once the sentence operation completes, project actions work normally again.
- Existing unsaved-change warnings still appear when appropriate.
- Existing Story-stage mutation disabling still works.
- Existing Setup Generate Story guard still works.
- Existing `/api/story/generate` overwrite guard remains intact.
- Legacy locked project migration still works.
- No Milestone 3+ scope is introduced.

## Regression Tests

Add frontend tests if a frontend test runner exists. If no frontend test runner exists, document manual verification clearly.

Suggested test cases:

- Start a mocked sentence operation, assert New/Open/Duplicate controls are disabled.
- Start a mocked sentence operation, attempt to select another project, assert active project does not change.
- Simulate a sentence operation resolving after `activeProjectId` changes, assert the old response is ignored.
- After the operation completes, assert project controls are enabled again.

If frontend tests are not practical in this repo, add a small helper function around stale-response checks and unit test that helper where possible.

Manual QA:

1. Start the app.
2. Open or create a lesson with a draft story.
3. Start Regenerate or Shorten on one sentence.
4. While the operation is loading, verify New, Open, Duplicate and project-list selections are unavailable.
5. Confirm the loading sentence still shows its operation state.
6. After the operation completes, verify project controls are available again.
7. Repeat with a simulated slow backend or mocked delayed response if possible.
8. Confirm the UI never jumps back to the old lesson after switching attempts.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run build --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "isSentenceOperationActive|sentenceOperations|runSentenceOperation|projectControls|disabled" frontend/src
rg "confirmedOverwrite|Confirm overwrite before generating|lockedSentences|validateLockedSentenceSnapshot" frontend/src server/src server/test
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "characters/extract|scenes/plan|images/character|images/scene|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

If a dev server is required for curl checks, start it with the existing dev command and stop it after verification.

## Handoff Notes

This is a concurrency and project identity fix. The simplest acceptable user-facing solution is to disable all project switching/duplication controls during a sentence operation. The most robust implementation also ignores stale sentence operation responses if the active project has changed before the response returns.

Do not weaken locked snapshot validation, overwrite confirmation, or stale downstream marking while making this fix.
