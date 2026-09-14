# Phase 0 Review

## Findings

No open findings.

Resolved during review:

- [P3] Screenshot filenames used `.png` but contained JPEG bytes
  - File/path: `prototype/screenshots/*.png`
  - Evidence: `file prototype/screenshots/*.png` initially reported JPEG image data for all seven screenshot files.
  - Why it matters: Later phases should be able to use the screenshot references without format ambiguity.
  - Fix applied: Converted all seven screenshot files in place to actual PNG files.

## Acceptance Summary

- Prototype frozen: Pass. `prototype/lesson-source-builder.dc.html` and `prototype/support.js` exist, and their SHA-1 hashes match the source files copied from `/Users/home/Desktop/Waiting on mockup scope/`.
- Screenshots complete: Pass. All seven required screenshot files exist, are non-empty, and are valid PNG files at 1280 x 720.
- UI rules documented: Pass. `docs/approved-ui-rules.md` records workflow order, visual rules, interaction behavior, learner-level constraints, character-field constraints, story draft/locked behavior, and Milestone 1 exclusions.
- Local render verified: Pass. `http://127.0.0.1:4173/` redirects to `http://127.0.0.1:4173/prototype/lesson-source-builder.dc.html`; the prototype rendered Setup, Story draft, and Story locked states during browser verification.
- Production dependency on `support.js` avoided: Pass. Non-prototype entrypoints only link or redirect to the frozen prototype; no production app code imports `prototype/support.js`.

## Acceptance Checklist

| Item | Result | Evidence |
| --- | --- | --- |
| `prototype/lesson-source-builder.dc.html` exists | Pass | File exists at 64K. |
| `prototype/support.js` exists | Pass | File exists at 68K. |
| `support.js` is documented as frozen generated runtime | Pass | `docs/approved-ui-rules.md` identifies it as the frozen runtime support file. |
| Prototype files are not treated as production app foundation | Pass | Docs forbid importing or depending on `prototype/support.js`; no production app code imports it. |
| Prototype opens locally | Pass | Browser verification loaded the root URL and redirected to the frozen prototype. |
| No blocking browser console errors appear during prototype render | Pass | Browser console error count was 0. |
| Setup screenshot exists and matches the Setup stage | Pass | `prototype/screenshots/01-setup.png`. |
| Story draft screenshot exists and matches the draft state | Pass | `prototype/screenshots/02-story-draft.png`. |
| Story locked screenshot exists and matches the locked state | Pass | `prototype/screenshots/03-story-locked.png`. |
| Characters screenshot exists and matches the Characters stage | Pass | `prototype/screenshots/04-characters.png`. |
| Scenes screenshot exists and matches the Scenes stage | Pass | `prototype/screenshots/05-scenes.png`. |
| Media screenshot exists and matches the Media stage | Pass | `prototype/screenshots/06-media.png`. |
| Export screenshot exists and matches the Export stage | Pass | `prototype/screenshots/07-export.png`. |
| UI rules are documented in `docs/approved-ui-rules.md` | Pass | Document exists and covers the approved UI behavior. |
| Six-stage workflow order is documented | Pass | Setup, Story, Characters, Scenes, Media, Export. |
| Learner level constraints are documented | Pass | Only the five approved learner levels are listed. |
| Character field constraints are documented | Pass | Lightweight fields are listed and disallowed dedicated visual/personality fields are named. |
| Story draft/locked behavior is documented | Pass | Draft, lock confirmation, locked state, unlock/stale risk, and downstream authority are documented. |
| Milestone 1 out-of-scope items are documented | Pass | OpenAI, image generation, PowerPoint, worksheet, accounts, cloud sync, Firebase, ElevenLabs, and video-platform APIs are excluded. |

## Open Questions

- None for Phase 0.

## Verdict

Pass. Phase 0 now preserves the approved prototype as frozen reference material, includes verified screenshot references for the required states, documents the approved UI and interaction rules, and avoids using the generated `support.js` as production application foundation code.
