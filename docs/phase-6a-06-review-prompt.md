# Phase 6A.06 Review Prompt

Use this prompt to review whether Phase 6A.06 of Lesson Source Builder was
implemented correctly.

## Prompt

You are reviewing Phase 6A.06: UX Polish.

Your job is to verify that the completed story editor and scene referencing
workflows are clear, accessible, responsive and consistent, without introducing
new product capabilities outside the polish phase.

Review Phase 6A.06 only. Do not require split sentence, merge sentence, AI
sentence replacement, AI story rebalance, AI scene planning, generated media
changes, backend revision endpoints, export changes, accounts or cloud sync.

## Phase Goal

The implementation is correct only if:

- Story sentence cards remain readable with 6, 9 and 12 sentence stories.
- Story editor controls have consistent placement, labels and visual hierarchy.
- Drag/reorder, Edit, Regenerate, Shorten, Delete and Add sentence controls do
  not crowd or overlap each other.
- Delete confirmation is clear, safe and tied to the correct sentence.
- Add sentence composer is clear, safe and does not mutate the lesson until
  submit.
- Count mismatch messaging is concise, non-blocking and updates after add/delete.
- Locked story state consistently hides or disables edit/reorder/delete/add
  controls.
- Scenes show covered, empty and unassigned sentence states clearly.
- Scene add/remove reference controls are usable and compact.
- Stale indicators remain visible and consistent without overwhelming the UI.
- Controls have accessible names or visible labels.
- Keyboard users can reach the main editor controls.
- Desktop and narrow viewport layouts do not overlap, overflow or hide controls.
- Existing Phase 6A.01 through Phase 6A.05 behavior still works.
- Existing tests pass.
- Frontend build passes.
- No later-phase AI/media/export features were accidentally added.

## Expected Files

Review these files or their close equivalents:

```text
docs/phase-6a-06-ux-polish-prompt.md
docs/phase-6a-05-scene-referencing-prompt.md
docs/phase-6a-05-review-prompt.md
docs/phase-6a-04-add-sentence-prompt.md
docs/phase-6a-04-review-prompt.md
docs/phase-6a-03-delete-sentence-prompt.md
docs/phase-6a-03-review-prompt.md
docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md
docs/phase-6a-02-review-prompt.md
docs/phase-6a-01-sentence-ordering-model-prompt.md
docs/phase-6a-01-review-prompt.md
frontend/src/App.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/styles.css
frontend/src/components/Icon.jsx
frontend/src/components/StatusBadge.jsx
frontend/src/components/StageHeader.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/test/sentenceOrdering.test.js
frontend/test/validateSetup.test.js
server/src/services/validateLesson.js
server/test/storyGeneration.test.js
```

Also inspect any tests or docs added specifically for Phase 6A.06.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
git diff -- docs frontend/src frontend/test server/src server/test package.json frontend/package.json package-lock.json
rg -n "sentence-card|sentence-add|confirmDelete|covered-sentences|unassigned|scene.*sentence|drag|aria-label|disabled|title" frontend/src frontend/test
rg -n "split sentence|merge sentence|rebalance|revise|revision|/api/story/revise|plan.*scene|scene.*plan|image prompt|generate image|export" frontend/src server/src docs
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
npm run dev
```

If scripts differ, inspect `package.json`, `frontend/package.json` and
`server/package.json`, then run the closest available frontend/backend tests and
frontend build.

Manual browser QA should be performed for desktop and a narrow/mobile-sized
viewport. If no browser QA is performed, report that as residual risk.

## Review Steps

1. Read `docs/phase-6a-06-ux-polish-prompt.md`.
2. Inspect the git diff and list every changed file.
3. Confirm most changes are local to `StoryStage.jsx`, `ScenesStage.jsx`,
   `styles.css` or narrowly justified UI helpers.
4. Confirm no broad model, validation, backend or generation behavior was
   changed without a clear bug-fix reason.
5. Confirm no new story editor capability was added beyond polish.
6. Inspect `frontend/src/stages/StoryStage.jsx`.
7. Confirm sentence text remains the primary readable element in each card.
8. Confirm sentence number remains visible and stable.
9. Confirm reorder controls are visually distinct from edit controls.
10. Confirm Edit, Regenerate and Shorten remain discoverable.
11. Confirm Delete is available but not visually dominant.
12. Confirm Add sentence is easy to find after the sentence list or in another
    predictable location.
13. Confirm Lock story remains the primary finalizing action.
14. Confirm delete confirmation copy is short and concrete.
15. Confirm Confirm Delete and Cancel are visually distinct.
16. Confirm delete confirmation state is tied to sentence ID, not array index.
17. Confirm Add sentence composer has a labelled textarea.
18. Confirm empty or whitespace-only Add cannot submit.
19. Confirm Add Cancel closes the composer without changing the lesson.
20. Confirm successful Add clears and closes the composer.
21. Confirm count mismatch notice is non-blocking and does not offer AI rebalance.
22. Confirm locked state hides or disables edit/reorder/delete/add controls.
23. Confirm unlock restores available editor controls.
24. Inspect `frontend/src/stages/ScenesStage.jsx`.
25. Confirm covered sentence rows show current story number and text.
26. Confirm empty scenes show a clear empty state.
27. Confirm unassigned sentences are visible, or all-assigned empty state is
    clear.
28. Confirm scene add/remove reference controls are compact and understandable.
29. Confirm scene location, image setting, character tags, Generate scene and Use
    this scene controls still work.
30. Confirm stale and approved badges remain visible.
31. Inspect `frontend/src/styles.css`.
32. Confirm story controls do not overlap text at common desktop widths.
33. Confirm story controls wrap cleanly on narrow widths.
34. Confirm scene reference controls do not overlap scene text, badges, fields or
    action buttons.
35. Confirm text inside buttons does not overflow.
36. Confirm textarea/composer widths stay inside their containers.
37. Confirm no decorative or broad palette changes were introduced.
38. Inspect accessibility attributes and labels.
39. Confirm icon-only controls have accessible names.
40. Confirm textareas/selects have visible labels or accessible labels.
41. Confirm disabled controls communicate their state through context, title or
    nearby text where needed.
42. Confirm color is not the only cue for destructive, disabled, stale or drop
    target states.
43. Inspect utility modules if touched.
44. Confirm semantics of `moveStorySentence`, `deleteStorySentence`,
    `addStorySentence` and scene-reference helpers were not changed except for
    narrow bug fixes.
45. Inspect tests.
46. Confirm Phase 6A.01 through Phase 6A.05 utility tests still exist and still
    cover the model behavior.
47. Confirm any new tests added for UX state are focused and not brittle CSS
    snapshots.
48. Run the relevant test suite and frontend build.
49. Perform or request manual browser QA for desktop and narrow viewport.
50. Report any failures with exact file and line references.

## Required Regression Coverage

Verify that existing tests still cover:

- sentence ordering model
- reorder helper upward/downward behavior
- stable sentence IDs after reorder
- delete helper behavior
- scene reference cleanup after delete
- add helper behavior
- safe unique sentence IDs after add
- count mismatch validity
- scene-reference selectors
- add/remove scene-reference helpers
- de-dupe and story-order sorting for scene references
- targeted stale behavior
- frontend setup validation
- backend validation and story generation behavior

Report any lost or weakened coverage as a finding.

## Manual QA Checklist

Manual QA is required for this phase because the main output is UX quality.

### Story Stage

Use stories with 6, 9 and 12 sentences. Verify:

1. Sentence cards are readable.
2. Sentence numbers are visible.
3. Edit opens the correct sentence.
4. Save keeps the edited sentence in place.
5. Regenerate targets the correct sentence.
6. Shorten targets the correct sentence.
7. Drag/reorder handle is clear.
8. Drag/reorder does not interfere with text selection.
9. Move controls, if present, have correct first/last disabled states.
10. Delete asks for confirmation.
11. Cancel delete restores normal controls.
12. Confirm delete removes the correct sentence.
13. Add sentence opens a composer.
14. Empty Add cannot submit.
15. Cancel Add does not change the lesson.
16. Successful Add creates one new card and clears the composer.
17. Count mismatch notice appears after add/delete when relevant.
18. Count mismatch notice is not styled like a blocking error.
19. Lock story hides or disables edit/reorder/delete/add controls.
20. Unlock story restores edit/reorder/delete/add controls.
21. Story actions do not overlap at desktop width.
22. Story actions do not overlap on a narrow/mobile-sized viewport.

### Scenes Stage

Use a lesson with at least three sentences and two scenes. Verify:

1. Covered sentences show current story numbers and text.
2. Reordering story sentences updates scene display numbers.
3. Empty scenes show a clear empty state.
4. Unassigned story sentences are visible when present.
5. Assigning a sentence updates the relevant scene.
6. Removing a sentence reference updates the relevant scene.
7. Duplicate assignment is prevented or neutralized.
8. Generated scenes show stale state after reference changes.
9. Approved scenes show stale state after reference changes.
10. Unrelated scenes do not become stale.
11. Characters do not become stale from scene reference edits.
12. Scene Location control still works.
13. Scene Image setting control still works.
14. Scene Generate button still works.
15. Use this scene button still works.
16. Scene controls do not overlap at desktop width.
17. Scene controls do not overlap on a narrow/mobile-sized viewport.

### Persistence

Verify:

1. Reorder marks the project unsaved.
2. Delete marks the project unsaved.
3. Add marks the project unsaved.
4. Scene reference edits mark the project unsaved.
5. Save succeeds.
6. Reopen preserves story order.
7. Reopen preserves added/deleted sentences.
8. Reopen preserves scene sentence references.
9. Reopen preserves stale and approved states.

### Keyboard And Focus

Verify by keyboard:

1. Tab reaches story edit controls.
2. Tab reaches reorder fallback controls if present.
3. Tab reaches Delete.
4. Tab reaches Confirm Delete and Cancel.
5. Tab reaches Add sentence.
6. Tab reaches Add composer textarea.
7. Tab reaches Add composer submit and cancel controls.
8. Tab reaches scene reference add/remove controls.
9. Focus remains understandable after Cancel Delete.
10. Focus remains understandable after Confirm Delete.
11. Focus remains understandable after Add sentence submit.
12. Focus remains understandable after scene reference changes.

## Accessibility Checks

Report findings for any of these:

- icon-only button lacks accessible name
- textarea or select lacks label/accessibility name
- Delete confirmation is not keyboard reachable
- Add composer controls are not keyboard reachable
- scene reference controls are not keyboard reachable
- disabled controls have no understandable context
- color is the only indicator for stale, destructive, disabled or drop target
  state
- focus disappears or jumps incoherently after common actions
- narrow viewport order makes keyboard navigation confusing

## Responsive Layout Checks

Check at least:

- desktop width around 1280px
- tablet/narrow width around 768px
- mobile/narrow width around 390px

Report findings for:

- story text overlapping controls
- controls overflowing card boundaries
- buttons with clipped text
- textarea/composer overflow
- delete confirmation crowding other controls
- drag controls causing unstable card height
- scene sentence rows overlapping remove controls
- scene picker/select overflowing scene cards
- unassigned sentence rows overflowing
- action buttons hidden or unreachable

## Specific Failure Modes To Look For

Report these as findings if present:

- UX polish changed sentence ordering semantics.
- UX polish changed or weakened stable sentence ID behavior.
- UX polish changed scene references from IDs to display numbers.
- Delete confirmation targets the wrong sentence after reorder.
- Add composer commits empty text.
- Opening or canceling Add marks the lesson unsaved.
- Locked stories still show active edit/reorder/delete/add affordances.
- Count mismatch notice blocks lock/save/open.
- Count mismatch notice offers AI rebalance in this phase.
- Scene covered sentences no longer show current story numbers.
- Empty scenes crash, disappear or show confusing blank output.
- Unassigned sentences are hidden with no empty-state logic.
- Stale badges are hidden behind controls or removed.
- Scene reference edits mark characters stale.
- Existing story editor actions regress.
- Save/open persistence regresses.
- CSS causes overlapping, clipped or overflowing controls.
- New broad styling changes make the UI inconsistent with the existing app.
- Split, merge, AI revision, AI scene planning, media or export features were
  added in this phase.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```text
Findings
- [P1] Title - file:line
  Explanation of the bug, risk or missing requirement.

Open Questions
- Any unclear product or implementation assumptions.

Test Results
- Command: result.

Manual QA
- Desktop: pass/fail/not run.
- Narrow viewport: pass/fail/not run.
- Keyboard: pass/fail/not run.

Summary
- Brief statement of whether Phase 6A.06 is correctly implemented.
```

If there are no findings, say so clearly and mention any residual manual QA or
test gaps.

## Out Of Scope

Do not mark the implementation incomplete because it lacks:

- split sentence
- merge sentence
- AI sentence replacement
- AI story rebalance
- AI scene planning
- automatic scene regrouping
- generated character or scene images
- scene image prompt generation
- backend revision endpoints
- export changes
- accounts or cloud sync

Those belong to later phases.

