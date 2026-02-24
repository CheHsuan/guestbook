---
description: How to deploy the guestbook application
---

# Deploy Workflow

## Pre-deployment Checklist

> **IMPORTANT**: Every major change or new feature MUST be tested before deploying.

// turbo-all

### 1. Run Unit Tests
```bash
npm test
```
All tests must pass before proceeding.

### 2. Test Locally (if UI or logic changes)
Start the local Firebase emulators to test with a local database and auth state:
```bash
npm start
```
Open http://localhost:5005 and verify visually. This will use the local emulator instead of production data.

### 3. Deploy

**Hosting only** (HTML/CSS/JS changes):
```bash
npx -y firebase-tools deploy --only hosting
```

**Database rules only** (security rule changes):
```bash
npx -y firebase-tools deploy --only database
```

**Both** (when you change rules + code):
```bash
npx -y firebase-tools deploy --only database,hosting
```

### 4. Verify on Live Site
After deploying, verify the changes on https://guestbook.slashstack.app

## Quick Deploy (tests + deploy in one command)
```bash
npm run deploy
```
This runs `npm test` first and only deploys if all tests pass.
