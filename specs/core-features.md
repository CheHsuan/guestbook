# Feature Specification: Core Functionality (Auth, Post, Delete)

## 1. Overview
The Guestbook is a public forum where users can leave short messages. To maintain accountability and prevent spam, viewing and interacting with the guestbook requires authentication.

## 2. User Stories

### Authentication
* As a visitor, I want to see a landing page explaining the guestbook when I am not logged in.
* As a visitor, I must sign in with my Google account to view the message feed or post a message.
* As a user, I want my Google display name and profile picture to represent me in the guestbook.
* As a user, I want to be able to sign out of the guestbook when I am finished.

### Viewing & Posting Messages
* As an authenticated user, I want to see a real-time feed of messages left by other users.
* As an authenticated user, I want to be able to write and publish a short message (up to 250 characters).
* As an authenticated user, I want to see character limits enforced as I type my message.
* As an authenticated user, I want to be protected from rate-limiting (spamming), meaning I cannot post too many messages in rapid succession.

### Message Deletion
* As an authenticated user, I want to be able to delete my own messages if I make a mistake.
* As an authenticated user, I should *not* be able to see delete buttons for messages posted by other users.
* As an authenticated user, I want my deleted message to immediately disappear from the feed for everyone else viewing the app in real-time.

## 3. Technical Requirements

### 3.1 Authentication Rules
* **Provider:** Google Auth (`firebase.auth.GoogleAuthProvider`).
* **State:** The `.messages-section` and `.post-section` are completely hidden via `display: none` when `currentUser` is null. The `.login-prompt` is displayed instead.

### 3.2 Posting Rules
* **Validation:** Messages must pass validation check (non-empty, <= 250 characters).
* **Payload:** When posting, the database record must include `text`, `author` (Google Display Name), `authorId` (Google UID), and a server-generated `timestamp`.
* **Rate Limits:** The client must enforce a cooldown and handle Firebase `PERMISSION_DENIED` errors gracefully by showing a specific `#rate-limit-msg` if the user tries to bypass client-side limits.

### 3.3 Deletion Rules
* **UI State:** The `.btn-delete` element must strictly only be rendered and appended to the message card if `msg.authorId === currentUser.uid`.
* **Database Rules:** Firebase Security Rules must enforce that a `delete` operation on `/messages/$messageId` is only allowed if `auth.uid === data.val().authorId`.
* **Real-time Removal:** The `child_removed` listener clears the corresponding DOM element by its ID `msg-<id>` and adjusts the total accurate counter.

## 4. Verification & Testing Checklist

When refactoring the core logic, verify the following:

- [ ] **Login Gate:** Open the app in an Incognito window. Verify that no messages are visible and the "Sign in with Google" button is prominent.
- [ ] **Post Validation:** Attempt to post an empty message. Verify the error prompt appears. Type 251 characters and verify the input is blocked/warns the user.
- [ ] **Data Integrity:** Post a valid message. Verify it appears immediately with your correct Google Display Name and a timestamp.
- [ ] **Author Deletion:** Find a message you just posted. Verify a trash/delete icon exists on the card. Click it, confirm the prompt, and verify the message disappears.
- [ ] **Foreign Deletion:** Find a message posted by a *different* user. Verify that there is *no* trash/delete icon on their card.
