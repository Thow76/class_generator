# Session Restoration Stage 7 Remediation Prompt

Use this prompt to remediate the Stage 7 review finding for Auto-Reopen Last Lesson.

## Prompt

You are remediating Stage 7 of the Lesson Source Builder session restoration work.

The Stage 7 implementation appears behaviorally correct, but review found one missing test case in the auto-reopen helper coverage. Your job is to add the missing test coverage without changing runtime behavior unless the new test exposes a real implementation bug.

Do not implement new restoration behavior, autosave, export generation, project deletion, auth, account sync, cloud sync, backend API changes, server-side sessions, or full lesson snapshots in browser storage.

## Finding To Fix

Fix this exact finding:

```text
[P3] frontend/test/projectAutoReopen.test.js does not cover the "no valid candidate returns null" case.

The implementation appears to handle it correctly, but the Stage 7 test checklist explicitly asks for that case.
```

## Expected Scope

This should normally be a test-only change in:

```text
frontend/test/projectAutoReopen.test.js
```

Runtime code in:

```text
frontend/src/utils/projectAutoReopen.js
```

should not need to change unless the new test fails and reveals an actual bug.

Do not modify backend files for this remediation.

## Source Context To Read First

Read these files before editing:

```text
docs/session-restoration-stage-7-auto-reopen-last-lesson-prompt.md
docs/session-restoration-stage-7-review-prompt.md
frontend/src/utils/projectAutoReopen.js
frontend/test/projectAutoReopen.test.js
frontend/src/utils/projectSessionStorage.js
```

## Commands To Run Before Editing

Use these commands to confirm the current test gap:

```sh
git status --short
sed -n '1,180p' frontend/src/utils/projectAutoReopen.js
sed -n '1,180p' frontend/test/projectAutoReopen.test.js
rg -n "no valid|returns null|unsafe|selectAutoReopenProject" frontend/test/projectAutoReopen.test.js
```

## Implementation Guidance

Add a focused test proving that `selectAutoReopenProject(projects)` returns `null` when the list has projects but none are valid/safe candidates.

Suggested test shape:

```js
test("selectAutoReopenProject returns null when no valid candidate exists", () => {
  const projects = [
    project("../lesson-bad", "2026-09-13T12:00:00.000Z"),
    project("project-20260912-120000-bad", "2026-09-12T12:00:00.000Z"),
    project("", "2026-09-11T12:00:00.000Z"),
    project(null, "2026-09-10T12:00:00.000Z")
  ];

  assert.equal(selectAutoReopenProject(projects), null);
});
```

Adapt the exact invalid values to match the existing test style. Include at least multiple invalid candidate shapes so the test proves the helper does not select unsafe ids from a non-empty list.

Keep the helper function `project(id, updatedAt, extra = {})` if it already exists in the test file.

## Regression Checks

Do not weaken existing tests that cover:

- Missing/empty input returns `null`.
- First valid safe id is selected.
- Unsafe ids are skipped when a later safe id exists.
- Metadata-error candidates are deprioritized when a readable candidate exists.
- Errored candidate can be returned if it is the only safe candidate.
- Sorting by `updatedAt` does not mutate the original list.
- Missing/invalid `updatedAt` values are handled predictably.

## Verification Commands

Run:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If time is constrained, at minimum run:

```sh
npm run test --workspace frontend
```

But the preferred remediation handoff should include all three standard verification commands.

Also run:

```sh
rg -n "no valid candidate|returns null when no valid|selectAutoReopenProject" frontend/test/projectAutoReopen.test.js
```

## Acceptance Criteria

This remediation is complete when:

- `frontend/test/projectAutoReopen.test.js` includes a clear test for a non-empty project list with no valid candidates returning `null`.
- Existing Stage 7 helper tests still pass.
- Runtime behavior is unchanged unless a real bug was uncovered and fixed.
- Frontend tests pass.
- Server tests and frontend build pass, or any inability to run them is explicitly reported.

## Final Response For The Implementer

In your final response, include:

- The test added.
- Whether runtime code changed.
- Verification commands run and their results.
- Whether any residual risk remains, especially around manual browser QA for startup auto-reopen behavior.
