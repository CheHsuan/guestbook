# Guestbook

A sleek, real-time online guestbook built with Firebase and Vanilla JavaScript. 

Visitors can browse the latest 24 hours of messages in a responsive, glassmorphism-inspired UI. Authenticated users can leave their own 250-character thoughts and manage their own posts, all synced instantaneously across clients.

## Features

- **Real-time Synchronization:** Powered by Firebase Realtime Database. As soon as a user posts or deletes a message, it updates instantly for everyone actively viewing the site.
- **24-Hour Active Feed:** The main feed strictly displays and counts only messages posted within the last 24 hours to keep the conversation fresh.
- **Infinite Scrolling:** Handles large volumes of messages smoothly by lazy-loading older posts as the user scrolls down the page.
- **Secure Authentication:** Utilizes Google Sign-In via Firebase Auth. Only authenticated users can post messages.
- **Self-Moderation:** Users can delete their own messages, but are restricted via Firebase Security Rules from altering or deleting messages belonging to others.
- **Rate Limiting:** Built-in safeguards prevent spam by rate-limiting users to one post every 5 seconds.
- **Warm & Bright UI:** A modern, inviting aesthetic utilizing warm color palettes and subtle glassmorphism effects.

## Tech Stack

- HTML5
- Vanilla JavaScript & CSS3 
- Firebase Realtime Database
- Firebase Authentication (Google Auth Provider)
- Firebase Hosting

## Local Development

If you wish to run the project locally without modifying the production database, this project is configured to use the Firebase Local Emulator Suite.

### Prerequisites
- Node.js (v18 or higher recommended)
- Docker & Docker Compose (for running the emulators in an isolated container)

### Setup & Run
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local emulators and UI:
   ```bash
   npm start
   ```

3. (Optional) Seed the local database with test data:
   ```bash
   node emulator/seed.js
   ```

4. Open your browser and navigate to `http://localhost:5005`

## Testing

The project includes a suite of unit tests for the core JavaScript utilities (timestamp formatting, XSS sanitization, message validation).

To run the test suite:
```bash
npm test
```

## Deployment

Production deploys are triggered by publishing a GitHub Release. The deploy workflow runs automatically and has two stages:

### How to deploy

1. **Merge all desired PRs to `main`**

2. **Sync `main` → `production`** — open a PR from `main` into `production` and merge it:
   ```bash
   gh pr create --base production --head main --title "chore: sync main to production" --body "Sync latest main into production for release."
   gh pr merge --squash
   ```

3. **Create a GitHub Release** — go to **GitHub → Releases → Draft a new release**:
   - Choose a tag (e.g. `v1.1.0`) pointed at the `production` branch HEAD
   - Fill in the release title and notes
   - Click **Publish release**

4. **Preview job runs automatically** — tests pass → hosting deployed to a `preview-{tag}` channel (expires 1 day). Check the preview URL in the Actions log.

5. **Approve the live deploy** — once the preview looks good:
   - Go to **GitHub → Actions** → find the running workflow
   - Click **Review deployments** → select `production` → **Approve and deploy**

6. **Live job deploys atomically** — hosting + database rules go live in a single command with no time gap.

### Required GitHub Environment

A `production` environment must be configured under **Settings → Environments** with at least one **Required reviewer** to gate the live deploy step.

## CI Setup

The CI workflows require two GitHub repository secrets. Configure them under **Settings → Secrets and variables → Actions** in your repository.

| Secret | Purpose | How to obtain |
|---|---|---|
| `GH_PAT` | Push commits, create/edit PRs and issues, merge PRs | Create a GitHub Personal Access Token with `repo` and `workflow` scopes at [github.com/settings/tokens](https://github.com/settings/tokens) |
| `CLAUDE_CODE_OAUTH_TOKEN` | Authenticate the Claude Code CLI for automated review, auto-fix, and health checks | Obtain via the Claude Code CLI by running `claude auth` after installing Claude Code |

Without these secrets, the `ci.yml`, `health-check.yml`, and `issue-scan.yml` workflows will fail silently on any fork or fresh repository setup.

## License

This project is open-source and available under the [MIT License](LICENSE).
