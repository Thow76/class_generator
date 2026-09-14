# Approved UI Rules

## Prototype Freeze

The approved prototype is frozen as a visual and behavioral reference for Milestone 1.

- Frozen HTML: `prototype/lesson-source-builder.dc.html`
- Frozen runtime support file: `prototype/support.js`
- Screenshot reference folder: `prototype/screenshots/`
- Freeze date: 2026-09-05
- Source files copied from:
  - `/Users/home/Desktop/Waiting on mockup scope/Lesson Source Builder.dc.html`
  - `/Users/home/Desktop/Waiting on mockup scope/support.js`

Do not edit the frozen prototype files. The production app must be rebuilt separately and must not import or depend on `prototype/support.js`.

## Screenshot References

The approved states captured for comparison are:

- `prototype/screenshots/01-setup.png`
- `prototype/screenshots/02-story-draft.png`
- `prototype/screenshots/03-story-locked.png`
- `prototype/screenshots/04-characters.png`
- `prototype/screenshots/05-scenes.png`
- `prototype/screenshots/06-media.png`
- `prototype/screenshots/07-export.png`

The prototype was verified locally through:

```text
http://127.0.0.1:4173/prototype/lesson-source-builder.dc.html
```

The render check produced no browser console errors.

## Workflow

The application uses a six-stage workflow in this exact order:

1. Setup
2. Story
3. Characters
4. Scenes
5. Media
6. Export

The app opens directly into the workflow. There is no marketing landing page.

## Left Navigation

The left navigation is a persistent desktop sidebar.

- Width is approximately 248px.
- It stays fixed/sticky while the main content scrolls.
- It shows the app title "Lesson Source Builder" with an `auto_stories` icon.
- Stage rows are clickable for available stages.
- The active stage uses a primary-container background.
- Completed stages use a `check_circle` icon and primary-colored icon treatment.
- The active stage uses an `hourglass_bottom` icon.
- Incomplete stages use a `radio_button_unchecked` icon.
- Stage labels stay in the approved order and should not be renamed without product approval.

## Visual System

Preserve the approved visual character:

- Roboto as the primary UI font.
- Material Symbols Rounded icon style.
- Warm off-white app background.
- White content cards with subtle outline borders.
- Teal primary action color.
- Muted secondary and tertiary container colors for status and media placeholders.
- Compact, desktop-first spacing.
- Page headers use a small uppercase step label, a 28px page title, and concise supporting copy.
- Form labels are small, medium-weight, and muted.
- Primary actions are filled teal buttons with icons where appropriate.
- Secondary actions are outlined or white surface buttons.

## Setup Stage

Setup collects the minimum lesson brief needed to generate later content.

- Sections are Lesson, Situation, Characters, and Language.
- Lesson fields are Theme, Lesson title, Learner level, and Setting.
- Learner level options are limited to:
  - Literacies Plus
  - Complete Beginner
  - Beginner 1
  - Beginner 1.5
  - Beginner 2
- Do not introduce CEFR labels such as A1, A2, or B1 in the main UI.
- Situation uses one main scenario textarea.
- Character setup remains lightweight:
  - Main character name
  - Approximate age
  - Gender
  - Ethnicity / background
  - Secondary characters as removable tags
- Language contains sentence count, optional target vocabulary, and additional notes.
- Sentence count options are 6, 8, 9, 10, and 12.

## Story Stage

Story has explicit Draft and Locked states.

- Draft state badge reads "Draft story".
- Locked state badge reads "Master story - locked" in the rebuilt app, matching the prototype intent.
- Story sentences appear as numbered cards.
- Desktop layout uses two wide columns at a max content width around 1600px.
- Story sentence cards should be wide enough for typical sentences to stay on one line where reasonable.
- Do not shrink story text merely to force one-line display.
- Each unlocked sentence card supports Edit, Regenerate, and Shorten controls.
- Editing happens inline with a textarea.
- Locking requires an explicit confirmation panel.
- Once locked:
  - Sentence editing controls are hidden.
  - Sentence cards show a lock icon.
  - Downstream stages must treat the exact locked sentences as authoritative.
- Unlocking is deliberate and should expose stale-content risk once downstream content exists.

## Characters Stage

Character cards keep inputs lightweight and continuity-focused.

- Each character card includes a portrait placeholder/reference area.
- Approved character cards show an Approved badge and primary border.
- Character fields are limited to:
  - Name
  - Age/Age range
  - Sex/Gender
  - Background/Nationality
  - Optional reusable Notes tags
- Do not add dedicated fields for hair, clothing, build, personality, expression, or visual style.
- Background behaves as a reusable searchable option list.
- New background values can be added from the field.
- Notes behave as removable tags.
- Suggested notes can be added with one click.
- New note tags can be typed and added, including by pressing Enter.
- Character generation is a dummy local state transition in Milestone 1.
- Character approval is a dummy local state transition in Milestone 1.

## Scenes Stage

Scenes are grouped from the locked story.

- Scene cards use a responsive grid with cards no narrower than approximately 360px.
- Each scene card includes:
  - Scene label
  - Approved badge when approved
  - Image/reference placeholder
  - Editable Location field
  - Covered story sentences
  - Generate, Regenerate, and Use this scene controls as state allows
- Scene generation is a dummy local state transition in Milestone 1.
- Scene approval is a dummy local state transition in Milestone 1.
- Approved scene cards use a primary border.

## Media Stage

Media is a final review layout for approved character and scene images.

- Header title is "Image review".
- Filters are All, Characters, and Scenes.
- The active filter uses the primary-container treatment.
- Media cards use a compact grid with image placeholders and metadata.
- Character cards use portrait icon treatment.
- Scene cards use image icon treatment.
- Each item displays its kind and approved status.

## Export Stage

Export summarizes the locked lesson source.

- Header title is "Export lesson source".
- Summary card shows lesson title and learner level.
- Summary rows show locked story sentences, approved characters, and approved scenes.
- Primary action is "Export lesson source" with a download icon.
- Secondary action is "Preview lesson" with a visibility icon.
- Real export generation is outside Milestone 1 unless represented by a placeholder control.

## Product Principles

- Minimum required input.
- Sensible later defaults.
- Optional user overrides.
- Local-only behavior for Milestone 1.
- No OpenAI integration in Milestone 1.
- No image-generation, PowerPoint, worksheet, account, cloud sync, Firebase, ElevenLabs, or video-platform API integration in Milestone 1.
