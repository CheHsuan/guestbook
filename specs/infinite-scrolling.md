# Feature Specification: Infinite Scrolling

## 1. Overview
The guestbook application displays public messages left by users. To handle large volumes of messages efficiently without degrading performance or causing excessive database reads, the application uses an infinite scrolling (lazy loading) pattern.

## 2. User Stories
* As a user, I want the initial page load to be extremely fast, so I don't have to wait for hundreds of recent messages to download before seeing the guestbook.
* As a user, I want to seamlessly scroll down the page to view older messages without having to click "Next Page" buttons.
* As a user, I want to see a visual indication when older messages are being fetched, so I know the application is working.
* As a user, I want to clearly see the total volume of messages available in the guestbook at a glance (e.g. "Messages from the last 24 hours 250").

## 3. Technical Requirements

### 3.1 Initial Load
* Upon opening the page, the application must fetch and render a strictly limited batch of the most recent messages.
* **Batch Limit:** The initial load is capped at `20` messages.

### 3.2 Real-time Updates
* The application must listen for new messages added to the database by other users in real-time.
* New messages must appear instantaneously at the top of the message list.
* The real-time listener must be configured to only listen for messages newer than the newest loaded message, preventing duplicate renders on load.

### 3.3 Pagination (Infinite Scroll)
* A scroll event listener must monitor the user's vertical scroll position on the page.
* When the user scrolls within `200px` of the bottom of the page body, the application must trigger a fetch for the next batch of older messages.
* **Query Offset:** The pagination query must request the next `20` messages starting immediately *before* the `oldestMessageTimestamp` currently rendered in the DOM.
* **Loading State:** During the fetch execution, a `.loading-state` spinner must be visibly appended to the absolute bottom of the `.messages-container`.
* **Latency Simulation (Emulator Only):** When developing locally against the emulator, an artificial 500ms delay is present in the fetch logic to ensure the loading state is visually perceptible for testing purposes.

### 3.4 Badge Counting Logic
* The badge located next to the "Messages from the last 24 hours" header must display the true, exact total count of all messages currently stored in the database.
* The badge must not represent merely the subset of messages currently loaded in the DOM.
* **Formatting Rule:** If the exact database count is 100 or greater, the badge text must be rounded down to the nearest hundred and appended with a plus sign (e.g., exactly `250` messages is formatted and displayed as `200+`).
* The system utilizes a lightweight `db.ref('messages').on('value')` listener referencing `snapshot.numChildren()` to keep this badge perfectly in sync.

## 4. Verification & Testing Checklist

When refactoring or modifying the guestbook feed, verify the following behaviors remain intact:

- [ ] **Initial Limit Check:** Refresh the page. Count the displayed message cards. Exactly 20 should be mounted under normal circumstances.
- [ ] **Badge Format Check:** Observe the count badge for large datasets. It should say `100+`, `200+`, etc., rather than raw numbers like `143`. If the database has 5 messages, it should read `5`.
- [ ] **Lazy Load Trigger Check:** Scroll to the bottom of the feed. The transition to loading more messages should activate automatically without user clicks.
- [ ] **Spinner Visibility Check:** Ensure the loading spinner mounts at the very bottom and has sufficient padding to be visible above the footer during the fetch interval.
- [ ] **Real-time Injection Check:** While viewing the feed in one browser window, post a message in another window. The new message should immediately append to the top of the feed in the first window.
- [ ] **Total Count Sync Check:** When a new message is posted or a message is deleted, the formatted total badge must update immediately (e.g. jumping from `99` to `100+`).
