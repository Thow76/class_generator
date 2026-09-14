# Phase 1 Review

## Findings

No open findings.

Resolved during review:

- [P3] Character background typing polluted reusable background options with partial values.
  - File/path: `frontend/src/App.jsx`
  - Fix applied: Character background edits now update only the selected character; reusable background creation remains an explicit add action.
- [P3] Character background datalist IDs were repeated once per card.
  - File/path: `frontend/src/stages/CharactersStage.jsx`
  - Fix applied: Datalist IDs are now unique per character card.
- [P3] Custom reusable note tags could be hidden from suggestions.
  - File/path: `frontend/src/stages/CharactersStage.jsx`
  - Fix applied: Suggestions now read from `lesson.noteOptions` without the previous display cap.
- [P3] Dummy Shorten could be a no-op for already short regenerated text.
  - File/path: `frontend/src/App.jsx`
  - Fix applied: Shorten now removes the dummy regeneration marker and trims longer sentences to a shorter text.

## Acceptance Summary

- App structure: Pass. React/Vite frontend exists under `frontend/`, Express backend exists under `server/`, and prototype/docs remain separate.
- Development commands: Pass. Root `npm run dev` runs frontend and backend workspaces. Separate `npm run dev:frontend` and `npm run dev:server` scripts are present.
- Backend health: Pass. `GET http://127.0.0.1:3001/api/health` returned `{"ok":true,"service":"lesson-source-builder-api","phase":"1"}`.
- Frontend health call: Pass. `http://127.0.0.1:5173/api/health` returned the backend health JSON through the Vite proxy, and the UI showed `API connected`.
- Workflow: Pass. Browser verification loaded directly into Setup and navigated Setup, Story, Characters, Scenes, Media and Export.
- Simulated interactions: Pass. Setup tag editing, Story edit/regenerate/shorten/lock/unlock/stale warning, Character generate/approve, Scene generate/approve, Media filters and Export placeholder were exercised successfully.
- Product constraints: Pass. App source contains no CEFR labels, no disallowed dedicated character visual/personality fields, no OpenAI integration, no persistence, no real image generation and no real ZIP export.
- Prototype safety: Pass. Frozen prototype files and screenshots still exist. Production frontend/server source has no `prototype/support.js` import or prototype dependency.

## Verification Commands

```sh
npm run build --workspace frontend
curl -sS http://127.0.0.1:3001/api/health
curl -sS -I http://127.0.0.1:5173/
curl -sS http://127.0.0.1:5173/api/health
rg "support\\.js|prototype/" frontend server package.json
rg "A1|A2|B1|CEFR|Hair|hair|Clothing|clothing|Personality|personality|Expression|expression|Visual style|visual style" frontend/src
```

## Browser Evidence

Live browser verification returned:

```json
{
  "initialStage": true,
  "apiConnected": true,
  "learnerLevels": [
    "Literacies Plus",
    "Complete Beginner",
    "Beginner 1",
    "Beginner 1.5",
    "Beginner 2"
  ],
  "secondaryAdded": true,
  "secondaryRemoved": true,
  "storyStage": true,
  "storyEdit": true,
  "regenerate": true,
  "lockConfirmVisible": true,
  "lockedVisible": true,
  "editButtonsLocked": 0,
  "charactersStage": true,
  "backgroundAdded": true,
  "noteAdded": true,
  "noteRemoved": true,
  "characterGenerated": true,
  "characterApproved": true,
  "scenesStage": true,
  "sceneLocationEdit": true,
  "coveredSentencesVisible": true,
  "sceneGenerated": true,
  "sceneApproved": true,
  "mediaStage": true,
  "mediaAllCount": 7,
  "mediaCharactersCount": 3,
  "mediaScenesCount": 4,
  "exportStage": true,
  "exportPlaceholder": true,
  "unlockWarning": true,
  "staleNotice": true,
  "staleBadges": 1,
  "finalConsoleErrors": []
}
```

Focused follow-up after the Shorten fix returned:

```json
{
  "beforeShorten": "Marta goes to the doctor's surgery.",
  "afterRegenerate": "Marta goes to the doctor's surgery. (updated draft)",
  "afterShorten": "Marta goes to the doctor's surgery.",
  "changedOnRegenerate": true,
  "changedOnShorten": true,
  "consoleErrors": []
}
```

## Acceptance Checklist

| Item | Result | Evidence |
| --- | --- | --- |
| React/Vite frontend exists under `frontend/` | Pass | `frontend/package.json`, `frontend/vite.config.js`, `frontend/src/main.jsx`, `frontend/src/App.jsx`. |
| Node/Express backend exists under `server/` | Pass | `server/package.json`, `server/src/index.js`, `server/src/routes/health.js`. |
| Root dev scripts are present and usable | Pass | Root `package.json` has `dev`, `dev:frontend`, `dev:server`, and `prototype`. |
| Backend starts locally | Pass | Local API process responded on `127.0.0.1:3001`. |
| `GET /api/health` returns JSON | Pass | Returned `{"ok":true,"service":"lesson-source-builder-api","phase":"1"}`. |
| Frontend starts locally | Pass | `curl -I http://127.0.0.1:5173/` returned `HTTP/1.1 200 OK`. |
| Frontend calls the health endpoint | Pass | UI displayed `API connected`; Vite proxy health request returned JSON. |
| App opens directly into workflow, not a marketing page | Pass | Browser loaded Setup heading `New lesson` at `/`. |
| Setup stage renders | Pass | Browser verified `New lesson`. |
| Story stage renders | Pass | Browser verified Story heading. |
| Characters stage renders | Pass | Browser verified Characters heading. |
| Scenes stage renders | Pass | Browser verified Scenes heading. |
| Media stage renders | Pass | Browser verified `Image review`. |
| Export stage renders | Pass | Browser verified `Export lesson source`. |
| Sidebar stage order is Setup, Story, Characters, Scenes, Media, Export | Pass | Browser extracted the six stage buttons in order. |
| Active stage indicator works | Pass | Setup initially used the active stage treatment. |
| Completed stage indicators work | Pass | Browser showed completed treatment after local approvals/lock. |
| Visual system matches the approved prototype closely | Pass | CSS follows the approved Roboto, Material Symbols, off-white, white cards, teal primary and compact desktop layout rules. |
| Story sentence cards are wide on desktop | Pass | `story-grid` uses two wide columns at desktop max width. |
| Story draft editing works | Pass | Inline edit changed sentence text. |
| Dummy Regenerate sentence behavior works | Pass | Regenerate appended visible dummy draft marker. |
| Dummy Shorten sentence behavior works | Pass | Shorten produced a visible shorter/cleaned sentence after fix. |
| Lock Story requires confirmation | Pass | Confirmation notice appeared before lock. |
| Locked story disables or hides editing controls | Pass | Browser counted 0 Edit buttons after lock. |
| Locked story state is visually clear | Pass | `Master story - locked` badge appeared and cards showed lock treatment. |
| Unlock Story is deliberate | Pass | Unlock button is explicit; downstream output triggers warning confirmation. |
| Stale warning or stale state appears when changing locked story after downstream dummy output exists | Pass | Browser verified stale notice and `Potentially stale` badge. |
| Setup learner levels match the approved list exactly | Pass | Browser extracted exactly the five approved levels. |
| No CEFR labels appear in the main app UI | Pass | Source scan found no CEFR labels in `frontend/src`. |
| Character fields stay lightweight | Pass | Character cards include Name, Age / age range, Sex / gender, Background / nationality, Notes tags only. |
| No hair/clothing/build/personality/expression/visual-style character fields appear | Pass | Source scan found none in `frontend/src`. |
| Character background reuse works | Pass | Browser added `Ukrainian` as a reusable background. |
| Character Notes tags can be added and removed | Pass | Browser added and removed a custom note tag. |
| Dummy Generate Character changes visible state | Pass | Browser verified `Generated`. |
| Dummy Use This Character approves the card | Pass | Browser verified `Approved`. |
| Scene cards render in a usable responsive grid | Pass | `scene-grid` uses `repeat(auto-fit, minmax(360px, 1fr))`. |
| Scene location editing works | Pass | Browser filled and verified a scene Location input. |
| Scene covered sentences are visible | Pass | Browser counted covered sentence rows. |
| Dummy Generate Scene changes visible state | Pass | Browser verified generated scene placeholder. |
| Dummy Use This Scene approves the card | Pass | Browser verified scene approval. |
| Media All filter works | Pass | Browser counted 7 media cards. |
| Media Characters filter works | Pass | Browser counted 3 character media cards. |
| Media Scenes filter works | Pass | Browser counted 4 scene media cards. |
| Export summary reflects local state | Pass | Browser summary showed learner level, 9 locked sentences, 1 approved character and 1 approved scene. |
| Export action is placeholder only | Pass | Button showed Phase 1 placeholder message and created no files. |
| No OpenAI integration exists | Pass | Source scan found no app OpenAI integration. |
| No real image generation exists | Pass | App uses local placeholder state only. |
| No local save/open/duplicate persistence exists | Pass | No persistence APIs or browser storage are present. |
| No real ZIP export exists | Pass | Export button only sets local placeholder message. |
| Production frontend does not import `prototype/support.js` | Pass | Source scan found no prototype import in frontend/server/package source. |
| Frozen prototype files remain untouched | Pass | Files still exist; production code remains separate. Git cannot prove an untouched diff because the repo contents are currently untracked. |

## Prototype Artifact Hashes

```text
058a3e8e7b81171eb0a868046dab5310a35413b3  prototype/lesson-source-builder.dc.html
2e38395c4a4ac9dd45b360554b9b99ba5a509250  prototype/support.js
903fa0e541f0e7c9ac5c9a32752db8cf460d889d  prototype/screenshots/01-setup.png
8bb4116e86d9a9df2ddb09b2bb3f5f21745a166c  prototype/screenshots/02-story-draft.png
0c95073c41d7b1db6530cfdd59a8c7b473b2bd64  prototype/screenshots/03-story-locked.png
58f5da91d6211978981dd03495a4fc0134bea901  prototype/screenshots/04-characters.png
95c5fefa2db09176410d94ca92449651f53668b7  prototype/screenshots/05-scenes.png
b0fbb748f2d35301fcb89eb3ea1a6707ed87870a  prototype/screenshots/06-media.png
10258f8b12c597f5a90e3591e2d733b2d4408ca4  prototype/screenshots/07-export.png
```

## Verdict

Pass. Phase 1 now satisfies the requested conventional React/Vite plus Node/Express shell, local simulated workflow behavior, backend health integration, product constraints and Phase 1 scope boundaries.
