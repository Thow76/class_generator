# Lesson Source Builder

Milestone 2 Phase 5 turns validated Setup data into a backend-generated,
editable story draft while keeping OpenAI keys and prompts server-side.

## Development

Install dependencies:

```sh
npm install
```

Start both the frontend and backend:

```sh
npm run dev
```

Or run them separately:

```sh
npm run dev:frontend
npm run dev:server
```

The frontend runs at:

```text
http://127.0.0.1:5173/
```

The backend health endpoint runs at:

```text
http://127.0.0.1:3001/api/health
```

The local project list endpoint runs at:

```text
http://127.0.0.1:3001/api/projects
```

Story Builder backend operations run through:

```text
http://127.0.0.1:3001/api/story/generate
http://127.0.0.1:3001/api/story/regenerate
http://127.0.0.1:3001/api/story/regenerate-sentence
http://127.0.0.1:3001/api/story/shorten-sentence
http://127.0.0.1:3001/api/story/lock
http://127.0.0.1:3001/api/story/unlock
```

For local story generation, copy `.env.example` to `.env` and set
`OPENAI_API_KEY`. `OPENAI_STORY_MODEL` is optional.

Run validation and backend tests:

```sh
npm test
```

## Local Persistence

Use the sidebar project controls to create a new lesson, save the current
lesson, open an existing lesson, or duplicate the saved project. Lessons are
stored locally by the backend as JSON under:

```text
server/data/projects/
```

Each saved project has its own generated `lesson-*` folder containing
`lesson.json` and `meta.json`. Phase 5 adds story generation only; it does not
include generated media, ZIP export, user accounts or cloud sync. See
`docs/phase-3-persistence.md` for the project route contract,
`docs/phase-4-setup-validation.md` for Setup validation behavior,
`docs/phase-5-story-generation.md` for the first story generation boundary, and
`docs/phase-6-story-builder.md` for regenerate, shorten, lock, unlock and stale
downstream behavior.

## Frozen Prototype

The Phase 0 prototype remains available for visual and behavioral comparison:

```sh
npm run prototype
```

Then open:

```text
http://127.0.0.1:4173/
```

The prototype files in `prototype/` are frozen reference artifacts. Do not edit
them when building the production app.
