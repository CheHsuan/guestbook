# CLAUDE.md — Guestbook

## Project Overview

A real-time online guestbook built with Firebase Realtime Database and Vanilla JavaScript. Visitors can browse the latest 24 hours of messages; authenticated users (Google Sign-In) can post and delete their own messages.

## Tech Stack

- **Language:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Firebase Realtime Database, Firebase Authentication (Google)
- **Hosting:** Firebase Hosting
- **Package Manager:** npm
- **Test Runner:** Jest (`npm test`)
- **Local Dev:** Firebase Local Emulator Suite via Docker Compose

## Commands

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start local emulator (Docker required)
npm start

# Seed local database with test data
node emulator/seed.js

# Deploy to production (runs tests first)
npm run deploy
```

## Branch Naming

| Type | Format |
|---|---|
| New feature | `feat/issue-{N}-{short-description}` |
| Bug fix | `fix/issue-{N}-{short-description}` |

Never commit directly to `main`.

## Commit Format (Conventional Commits)

```
<type>(<scope>): <description> #Issue-{N}

Examples:
feat(ui): add character counter to message input #12
fix(auth): handle sign-out race condition #7
```

## Pull Request Rules

- Every PR must reference a GitHub Issue (`Closes #N`)
- PR must pass all Jest tests (`npm test`) before merge
- No hardcoded Firebase config, API keys, or tokens — always use environment variables or Firebase SDK config
- XSS: all user-generated content must be sanitized before rendering to DOM (use `textContent`, not `innerHTML`)

## Security

- Firebase Security Rules enforce that users can only delete their own messages
- All secrets via environment variables — never commit Firebase service account keys
- User input must be sanitized against XSS before any DOM insertion

## GitHub Issue Labels

| Label | Meaning |
|---|---|
| `ready-for-dev` | Issue is clear and ready for the agent to pick up |
| `priority-high` | Pick this first |
| `priority-medium` | Normal priority |
| `priority-low` | Pick last |
| `in-progress` | Agent is currently working on this |
| `needs-clarification` | Agent paused — human needs to add more details |
| `human-in-the-loop` | Agent hit a blocker — requires human action |
| `auto-generated` | Created automatically by the agent |

## Available Slash Commands

- `/create-pr` — Create a PR for the current branch with correct format
- `/self-review` — Run self-review checklist before merge
- `/create-bug-issue` — Create a GitHub Issue for an auto-detected bug
