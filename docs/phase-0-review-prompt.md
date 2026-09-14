# Phase 0 Review Prompt

Use this prompt to review whether Phase 0 of Lesson Source Builder was implemented correctly. Treat all files in `prototype/` as frozen reference artifacts, not as production application code.

## Prompt

You are reviewing Phase 0 of the Lesson Source Builder implementation.

Your job is to verify that the approved design prototype has been frozen correctly and that the repository now contains enough reference material for later phases to rebuild the app without modifying or depending on the generated prototype runtime.

Review only Phase 0. Do not review Phase 1+ implementation unless later-phase work has accidentally changed, depended on, or weakened the prototype freeze.

## Phase 0 Goal

Preserve the approved design as a reference before changing architecture.

The implementation is correct only if:

- The approved `.dc.html` prototype has been copied into `prototype/`.
- The generated `support.js` file has been copied into `prototype/`.
- The prototype still opens locally.
- Screenshots exist for the required workflow states.
- Approved UI rules and interaction decisions are recorded in docs.
- `support.js` has not been edited or repurposed as the application foundation.
- The prototype is clearly documented as frozen reference material.

## Expected Files

Verify that these files exist:

```text
prototype/lesson-source-builder.dc.html
prototype/support.js
prototype/screenshots/01-setup.png
prototype/screenshots/02-story-draft.png
prototype/screenshots/03-story-locked.png
prototype/screenshots/04-characters.png
prototype/screenshots/05-scenes.png
prototype/screenshots/06-media.png
prototype/screenshots/07-export.png
docs/approved-ui-rules.md
README.md
```

## Review Steps

1. Inspect the repository structure.
2. Confirm `prototype/lesson-source-builder.dc.html` and `prototype/support.js` are present.
3. Confirm all seven screenshot files are present and non-empty.
4. Open the screenshots and verify they correspond to:
   - Setup
   - Story draft
   - Story locked
   - Characters
   - Scenes
   - Media
   - Export
5. Read `docs/approved-ui-rules.md`.
6. Confirm it records the approved workflow, visual rules, interaction behavior and product constraints.
7. Confirm the docs explicitly say the prototype is frozen and must not be edited.
8. Confirm the docs explicitly say the production app must not import or depend on `prototype/support.js`.
9. Start the local preview server if package scripts are present.
10. Open the local preview URL and confirm the prototype renders without obvious visual failure.
11. Check the browser console for errors during prototype render.
12. Inspect source references in any non-prototype app entrypoints, if present, and confirm they do not import `prototype/support.js` as production foundation code.

## Commands To Consider

Use commands like these as needed:

```sh
find . -maxdepth 3 -type f | sort
ls -lh prototype prototype/screenshots
sed -n '1,220p' docs/approved-ui-rules.md
sed -n '1,120p' README.md
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" .
npm run dev
```

If using `npm run dev`, verify the documented URL:

```text
http://127.0.0.1:4173/
```

The root page may redirect to:

```text
http://127.0.0.1:4173/prototype/lesson-source-builder.dc.html
```

## Acceptance Checklist

Mark each item Pass, Fail, or Not Applicable.

| Item | Result | Evidence |
| --- | --- | --- |
| `prototype/lesson-source-builder.dc.html` exists |  |  |
| `prototype/support.js` exists |  |  |
| `support.js` is documented as frozen generated runtime |  |  |
| Prototype files are not treated as production app foundation |  |  |
| Prototype opens locally |  |  |
| No blocking browser console errors appear during prototype render |  |  |
| Setup screenshot exists and matches the Setup stage |  |  |
| Story draft screenshot exists and matches the draft state |  |  |
| Story locked screenshot exists and matches the locked state |  |  |
| Characters screenshot exists and matches the Characters stage |  |  |
| Scenes screenshot exists and matches the Scenes stage |  |  |
| Media screenshot exists and matches the Media stage |  |  |
| Export screenshot exists and matches the Export stage |  |  |
| UI rules are documented in `docs/approved-ui-rules.md` |  |  |
| Six-stage workflow order is documented |  |  |
| Learner level constraints are documented |  |  |
| Character field constraints are documented |  |  |
| Story draft/locked behavior is documented |  |  |
| Milestone 1 out-of-scope items are documented |  |  |

## Product Constraints To Verify In Documentation

Confirm the Phase 0 docs preserve these constraints:

- The workflow order is Setup, Story, Characters, Scenes, Media, Export.
- Learner levels are limited to:
  - Literacies Plus
  - Complete Beginner
  - Beginner 1
  - Beginner 1.5
  - Beginner 2
- CEFR labels such as A1, A2 and B1 are not part of the main app UI.
- Character fields stay lightweight:
  - Name
  - Age/Age range
  - Sex/Gender
  - Background/Nationality
  - Optional reusable Notes tags
- Dedicated character fields for hair, clothing, build, personality, expression or visual style are not added.
- Story has explicit Draft and Locked states.
- Locked story sentences are authoritative for downstream stages.
- Milestone 1 excludes OpenAI integration, real image generation, PowerPoint generation, worksheet generation, accounts, cloud sync, Firebase, ElevenLabs and video-platform APIs.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```md
# Phase 0 Review

## Findings

- [P0/P1/P2/P3] Title
  - File/path:
  - Evidence:
  - Why it matters:
  - Recommended fix:

## Acceptance Summary

- Prototype frozen:
- Screenshots complete:
- UI rules documented:
- Local render verified:
- Production dependency on `support.js` avoided:

## Open Questions

- ...

## Verdict

Pass/Fail with a one-paragraph explanation.
```

If there are no findings, say so clearly and still include any residual risks or unverified checks, such as inability to run the local server or inspect screenshots visually.

## Severity Guidance

- P0: Phase 0 cannot be considered implemented, for example missing prototype files.
- P1: Major freeze or reference failure, for example missing key screenshots, prototype cannot open, or production code depends on `prototype/support.js`.
- P2: Important documentation or verification gap, for example UI rules omit major product constraints.
- P3: Minor clarity, naming, or documentation improvement.

## Non-Goals For This Review

Do not request or require:

- OpenAI API setup.
- Real story generation.
- Character extraction.
- Image generation.
- Persistent lesson save/open.
- ZIP export.
- PowerPoint or worksheet output.
- Firebase, accounts or cloud sync.

Those belong to later phases.
