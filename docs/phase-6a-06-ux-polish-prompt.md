# Phase 6A.06 UX Polish Prompt

Use this prompt to implement the sixth slice of the Story Editor Upgrade for
Lesson Source Builder.

## Prompt

You are implementing Phase 6A.06: UX Polish.

Phase 6A.01 established the sentence ordering model. Phase 6A.02 added
drag-and-drop sentence reordering. Phase 6A.03 added delete sentence. Phase
6A.04 added add sentence. Phase 6A.05 added manual scene referencing. This phase
polishes those editor workflows so the tutor experience is clear, calm,
accessible and reliable across desktop and narrow screens.

Implement UX polish only. Do not build split sentence, merge sentence, AI
rebalance, AI sentence replacement, AI scene planning, generated media changes,
backend revision endpoints, export changes, accounts or cloud sync in this
phase.

## Phase Goal

The story and scene editing workflows should feel coherent and easy to use:

- sentence cards are readable
- reorder/delete/add/edit controls are discoverable but not cluttered
- scene reference controls are understandable
- locked versus unlocked states are obvious
- stale/count/unassigned states are visible without being alarming
- keyboard and screen-reader users can use the main controls
- mobile/narrow layouts do not overlap or break

Done means:

- Story editor controls have consistent placement, labels and visual hierarchy.
- Drag handles, move controls, Edit, Regenerate, Shorten, Delete and Add sentence
  controls do not crowd each other.
- Delete confirmation and Add sentence composer states are clear.
- Count mismatch messaging is concise and non-blocking.
- Locked story state hides or disables editing controls consistently.
- Scenes show covered, empty and unassigned sentence states clearly.
- Scene add/remove reference controls are usable and compact.
- Stale indicators are visible but not noisy.
- Existing story and scene editor behavior still works.
- Accessibility basics are covered for all interactive controls.
- Desktop and narrow viewport manual QA passes.
- Tests are updated only where useful for UX-related state behavior.

## Product Reasoning

The tutor is shaping a generated story into a teaching-ready master text. The UI
should support quick judgement calls:

```text
This sentence is redundant.
This sentence belongs earlier.
This sentence belongs in Scene 2.
This story has 11 sentences but the target was 12.
```

Those actions should be easy without making the screen feel like a technical
data editor. This phase should improve confidence and flow, not add new editing
power.

## Current Relevant Files

Review these files before editing:

```text
docs/phase-6a-01-sentence-ordering-model-prompt.md
docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md
docs/phase-6a-03-delete-sentence-prompt.md
docs/phase-6a-04-add-sentence-prompt.md
docs/phase-6a-05-scene-referencing-prompt.md
docs/phase-6a-01-review-prompt.md
docs/phase-6a-02-review-prompt.md
docs/phase-6a-03-review-prompt.md
docs/phase-6a-04-review-prompt.md
docs/phase-6a-05-review-prompt.md
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

Also inspect any Phase 6A cleanse prompts and tests if present.

## Scope

Build:

- Visual and interaction polish for Story stage controls.
- Visual and interaction polish for Scenes stage reference controls.
- Consistent labels and button styles.
- Clear locked/unlocked affordances.
- Clear count mismatch, empty scene and unassigned sentence states.
- Accessibility improvements for existing controls.
- Responsive layout fixes for desktop and narrow screens.
- Small utility or state tests only where needed.

Do not build:

- New story editor capabilities.
- Split sentence.
- Merge sentence.
- AI sentence replacement.
- AI story rebalance.
- AI scene planning.
- Automatic scene regrouping.
- Generated image/media behavior.
- Backend revision endpoints.
- Export changes.

## UX Requirements

### 1. Story Card Control Hierarchy

Story sentence cards should remain readable first, editable second.

Requirements:

- Sentence text is the strongest element inside each card.
- Sentence number is visible and stable.
- Drag/reorder controls are visually distinct from text editing controls.
- Edit, Regenerate and Shorten remain easy to find.
- Delete is available but not visually dominant.
- Add sentence is easy to find after the sentence list.
- Lock story remains the primary finalizing action.
- Controls do not wrap into confusing order on desktop or narrow screens.

Avoid:

- too many same-weight buttons in one row
- controls that push sentence text into cramped columns
- icon-only buttons without labels or accessible names
- Delete styled like the main positive action

### 2. Reorder Controls

The drag/reorder affordance should feel intentional.

Requirements:

- Drag handle has a stable size.
- Drag handle has an accessible label.
- Dragging state is visually clear.
- Drop target state is visually clear.
- Keyboard/fallback move controls, if present, are consistent and not cluttered.
- First/last move controls, if present, have correct disabled states.
- Textarea editing does not trigger dragging.
- Button clicks do not trigger dragging.
- Locked story state hides or disables reorder controls.

### 3. Delete Confirmation

Delete should be hard to trigger accidentally but quick to confirm.

Requirements:

- First click enters confirmation state.
- Confirmation copy is short and concrete.
- Confirm Delete is visually distinct from Cancel.
- Cancel restores the normal action row.
- Confirmation state is tied to sentence ID, not array index.
- Confirmation state does not jump to another card after reorder.
- Confirmation controls do not overlap text or drag controls.
- Locked story state hides or disables Delete.

Suggested copy:

```text
Delete this sentence?
Delete
Cancel
```

### 4. Add Sentence Composer

The Add sentence flow should feel like a small composer, not a modal unless an
existing pattern clearly prefers one.

Requirements:

- Add sentence opens an inline composer.
- Composer has a labelled textarea.
- Empty or whitespace-only text cannot be submitted.
- Cancel closes the composer without changing the lesson.
- Successful Add clears and closes the composer.
- Composer placement is predictable, preferably after the sentence list.
- Composer does not steal or lose text from an existing edited sentence.
- Locked story state hides or disables Add sentence.

### 5. Count Mismatch Notice

If the current story length differs from `lesson.sentenceCount`, show a concise,
non-blocking state.

Requirements:

- Message is visible in Story stage.
- Message is not an error.
- Message does not block lock/save/open.
- Message updates after add/delete.
- Message does not offer AI rebalance in this phase.

Suggested copy:

```text
Story has 11 sentences. Setup target is 12.
```

or:

```text
Story has 13 sentences. Setup target is 12.
```

### 6. Locked Story State

Locked state should be obvious and consistent.

Requirements:

- Locked story cards do not show active edit/reorder/delete/add controls.
- Existing lock icon/status remains clear.
- Unlock warning remains clear when downstream output exists.
- Locked state does not change sentence layout so dramatically that the page
  jumps.
- Unlock restores the same editor controls that were available before locking.

Do not change the underlying lock policy in this phase.

### 7. Scenes Covered Sentences

Covered sentence display should make scene references understandable.

Requirements:

- Each covered sentence row shows current story number and text.
- Rows are compact but readable.
- Remove-reference control is clear and not visually dominant.
- Empty scenes show a clear empty state.
- Missing sentence fallback, if any, does not crash the UI.
- Scene location, image setting, character tags, Generate scene and Use this
  scene controls remain usable.

Suggested empty copy:

```text
No covered sentences
```

### 8. Scene Reference Add Controls

Adding sentence references should be clear without overwhelming each scene card.

Requirements:

- Available sentence options include enough text to distinguish them.
- Current story numbers are shown in picker/options where practical.
- Duplicate assignment to the same scene is prevented or neutralized.
- Missing sentence IDs cannot be introduced.
- Assignment controls do not crowd location/image controls.
- On narrow screens, controls stack cleanly.

### 9. Unassigned Sentences

Unassigned sentence state should be easy to scan.

Requirements:

- Unassigned section has a concise heading.
- Each unassigned sentence shows current story number and text.
- If assign controls exist in this section, they are clear and compact.
- If no sentences are unassigned, either hide the section or show a small
  positive/empty state.
- Unassigned sentences are not presented as errors in this phase.

Suggested heading:

```text
Unassigned story sentences
```

### 10. Stale Indicators

Stale state should signal review need without making the UI feel broken.

Requirements:

- Stale badges remain visible on affected scenes/records.
- Badge language stays consistent with existing app wording.
- Stale badge does not obscure scene controls.
- Stale state is not overused for unassigned sentences unless already part of
  the data model.

Existing copy such as `Potentially stale` is acceptable.

## Accessibility Requirements

Check and improve the following:

- Buttons have clear text or `aria-label`.
- Icon-only controls have accessible names.
- Textareas and selects have visible labels or accessible labels.
- Disabled controls communicate why through context, title or nearby text when
  needed.
- Keyboard users can reach Add, Cancel, Delete confirmation, reorder fallback
  and scene reference controls.
- Focus is sensible after Add, Cancel, Confirm Delete and reference changes.
- Drag-and-drop has a keyboard/fallback option or a documented limitation.
- Color is not the only cue for stale, drop target, disabled or destructive
  states.

Do not add lengthy instructional text to the app to satisfy accessibility.

## Responsive Layout Requirements

Verify and adjust CSS so:

- Story sentence cards remain readable on desktop.
- Sentence text does not overlap controls.
- Text inside buttons does not overflow.
- Add composer does not exceed its container.
- Delete confirmation does not collide with drag/edit controls.
- Scene reference rows wrap cleanly.
- Selects or menus do not overflow scene cards.
- Unassigned sentence rows fit narrow screens.
- Stage actions remain reachable.

Use stable dimensions, spacing and wrapping rules where practical. Do not scale
font size with viewport width.

## Implementation Guidance

### Keep Changes Local

Most changes should be in:

```text
frontend/src/stages/StoryStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/styles.css
```

Only touch utility modules if a small derived state helper or accessibility state
helper is genuinely needed.

### Preserve Existing Behavior

Do not change the semantics of:

- `moveStorySentence`
- `deleteStorySentence`
- `addStorySentence`
- scene reference add/remove helpers
- normalizers
- validators
- backend story generation

If a UX issue exposes a real bug in those helpers, fix it narrowly and add a
test.

### Prefer Existing Patterns

Use existing app patterns:

- `Icon`
- `StatusBadge`
- `StageHeader`
- existing `.button`, `.mini-button`, `.notice`, `.field`, `.tag` styles
- existing locked and stale language

Avoid introducing a new component library or broad design system refactor.

### Button And Icon Guidance

Use text buttons where the action benefits from explicit wording:

```text
Edit
Save
Delete
Cancel
Add sentence
```

Use icons when they clarify tool-like actions, but keep accessible labels.

Possible existing icon names:

```text
drag_indicator
keyboard_arrow_up
keyboard_arrow_down
delete
add
close
check
warning
lock
lock_open
```

Do not rely on unfamiliar icons without labels.

### CSS Guidance

Update `frontend/src/styles.css` carefully.

Preferred approach:

- add focused classes for editor controls
- use flex/grid wrapping where needed
- keep card radius and spacing consistent with existing app
- avoid nested card visuals
- avoid decorative backgrounds
- avoid broad color palette changes

Look for existing class names before inventing new ones.

## Tests

This phase is mostly UX polish, so do not force brittle visual snapshot tests.
Add or update tests only when a state behavior changes or a bug is fixed.

### Tests To Preserve

Existing tests from Phase 6A.01 through Phase 6A.05 must still pass, including:

- sentence ordering model
- drag/reorder helper behavior
- delete helper behavior
- add helper behavior
- scene-reference selector and helper behavior
- frontend validation
- backend validation/generation tests

### Tests To Add If Needed

Add focused tests if changes affect:

- count mismatch visibility state
- helper behavior for no-op actions
- selector output for empty scene or all-assigned states
- any bug discovered while polishing

Do not add tests that depend on fragile CSS class ordering unless there is
already a local testing pattern for that.

## Manual QA Checklist

Manual QA is required for this phase.

### Story Stage

Verify:

1. Sentence cards are readable with 6, 9 and 12 sentence stories.
2. Edit opens and saves the correct sentence.
3. Regenerate and Shorten still target the correct sentence.
4. Drag/reorder handle is clear and does not interfere with text selection.
5. Move controls, if present, have correct first/last disabled states.
6. Delete asks for confirmation.
7. Cancel delete restores normal controls.
8. Confirm delete removes the correct sentence.
9. Add sentence opens a composer.
10. Empty Add cannot submit.
11. Cancel Add does not change the lesson.
12. Successful Add creates a new card and clears the composer.
13. Count mismatch notice appears after add/delete when relevant.
14. Lock story hides or disables edit/reorder/delete/add controls.
15. Unlock story restores edit/reorder/delete/add controls.
16. Story actions do not overlap on a narrow viewport.

### Scenes Stage

Verify:

1. Covered sentences show current story numbers and text.
2. Reordering story sentences updates scene display numbers.
3. Empty scenes show a clear empty state.
4. Unassigned story sentences are visible when present.
5. Assigning a sentence updates the relevant scene.
6. Removing a sentence reference updates the relevant scene.
7. Duplicate assignment is prevented or neutralized.
8. Generated or approved scenes show stale state after reference changes.
9. Unrelated scenes do not become stale.
10. Characters do not become stale from scene reference edits.
11. Scene location and image setting controls still work.
12. Generate scene and Use this scene buttons still work.
13. Scene reference controls do not overlap on a narrow viewport.

### Persistence

Verify:

1. Reorder, delete, add and scene reference edits mark the project unsaved.
2. Save succeeds.
3. Reopen preserves story order.
4. Reopen preserves added/deleted sentences.
5. Reopen preserves scene sentence references.
6. Reopen preserves stale and approved states.

### Accessibility

Verify by keyboard:

1. Tab reaches story edit controls.
2. Tab reaches reorder fallback controls if present.
3. Tab reaches Delete, Confirm Delete and Cancel.
4. Tab reaches Add sentence composer controls.
5. Tab reaches scene reference add/remove controls.
6. Focus remains understandable after submit/cancel actions.

## Acceptance Checklist

- Story editor controls are visually coherent and not cluttered.
- Delete confirmation state is clear and safe.
- Add sentence composer state is clear and safe.
- Count mismatch notice is concise and non-blocking.
- Locked story state consistently disables or hides editing controls.
- Scene covered sentence rows are readable and ordered by current story order.
- Empty scene state is clear.
- Unassigned sentence state is clear.
- Scene add/remove reference controls are usable.
- Stale indicators remain visible and consistent.
- Controls have accessible names or visible labels.
- Keyboard navigation covers the main editor controls.
- Narrow viewport layout does not overlap or overflow.
- Existing Phase 6A.01 through Phase 6A.05 behavior still works.
- Existing tests pass.
- Frontend build passes.
- No split, merge, AI revision, AI scene planning, media or export features were
  added.

## Suggested Commands

Run the project-specific equivalents if scripts differ:

```sh
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
rg -n "split sentence|merge sentence|rebalance|revise|revision|/api/story/revise|plan.*scene|scene.*plan|image prompt|generate image" frontend/src server/src docs
rg -n "sentence-card|sentence-add|confirmDelete|covered-sentences|unassigned|scene.*sentence|drag" frontend/src frontend/test
```

Manual browser QA should also be completed for desktop and a narrow/mobile-sized
viewport.

## Out Of Scope For This Phase

These are intentionally left for later phases:

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

