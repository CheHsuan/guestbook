/**
 * @jest-environment node
 */

'use strict';

const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { ref, set, get, remove } = require('firebase/database');
const { readFileSync } = require('fs');
const path = require('path');

const PROJECT_ID = 'demo-guestbook';
const DB_HOST = 'localhost';
const DB_PORT = 9000;

let testEnv;

beforeAll(async () => {
  const rules = readFileSync(path.resolve(__dirname, '../database.rules.json'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: { host: DB_HOST, port: DB_PORT, rules },
  });
}, 30000);

afterAll(async () => {
  await testEnv?.cleanup();
});

afterEach(async () => {
  await testEnv?.clearDatabase();
});

function validMessage(authorId = 'uid-alice') {
  return {
    text: 'Hello world',
    author: 'Test User',
    authorId,
    timestamp: Date.now(),
  };
}

function aliceDb() {
  return testEnv.authenticatedContext('uid-alice', { name: 'Test User' }).database();
}

function bobDb() {
  return testEnv.authenticatedContext('uid-bob', { name: 'Bob' }).database();
}

function anonDb() {
  return testEnv.unauthenticatedContext().database();
}

async function seedMessage(path, data) {
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await set(ref(ctx.database(), path), data);
  });
}

// ============================================================
// Messages — read access
// ============================================================
describe('messages: read access', () => {
  test('unauthenticated users can read messages', async () => {
    await assertSucceeds(get(ref(anonDb(), 'messages')));
  });

  test('authenticated users can read messages', async () => {
    await assertSucceeds(get(ref(aliceDb(), 'messages')));
  });
});

// ============================================================
// Messages — write access
// ============================================================
describe('messages: write access', () => {
  test('unauthenticated users cannot write messages', async () => {
    await assertFails(set(ref(anonDb(), 'messages/msg1'), validMessage()));
  });

  test('authenticated users can write a valid new message', async () => {
    await assertSucceeds(set(ref(aliceDb(), 'messages/msg1'), validMessage()));
  });

  test('authenticated users can delete their own message', async () => {
    await seedMessage('messages/msg1', validMessage('uid-alice'));
    await assertSucceeds(remove(ref(aliceDb(), 'messages/msg1')));
  });

  test('authenticated users cannot delete another user\'s message', async () => {
    await seedMessage('messages/msg1', validMessage('uid-alice'));
    await assertFails(remove(ref(bobDb(), 'messages/msg1')));
  });
});

// ============================================================
// Messages — field validation
// ============================================================
describe('messages: field validation', () => {
  test('rejects text longer than 250 characters', async () => {
    const msg = { ...validMessage(), text: 'A'.repeat(251) };
    await assertFails(set(ref(aliceDb(), 'messages/msg1'), msg));
  });

  test('accepts text at exactly 250 characters', async () => {
    const msg = { ...validMessage(), text: 'A'.repeat(250) };
    await assertSucceeds(set(ref(aliceDb(), 'messages/msg1'), msg));
  });

  test('rejects empty text', async () => {
    const msg = { ...validMessage(), text: '' };
    await assertFails(set(ref(aliceDb(), 'messages/msg1'), msg));
  });

  test('rejects authorId that does not match auth.uid', async () => {
    const msg = { ...validMessage(), authorId: 'uid-bob' };
    await assertFails(set(ref(aliceDb(), 'messages/msg1'), msg));
  });

  test('rejects unknown fields ($other)', async () => {
    const msg = { ...validMessage(), unknownField: 'not allowed' };
    await assertFails(set(ref(aliceDb(), 'messages/msg1'), msg));
  });

  test('rejects message missing required text field', async () => {
    const { text: _, ...msg } = validMessage();
    await assertFails(set(ref(aliceDb(), 'messages/msg1'), msg));
  });

  test('rejects message missing required authorId field', async () => {
    const { authorId: _, ...msg } = validMessage();
    await assertFails(set(ref(aliceDb(), 'messages/msg1'), msg));
  });

  test('rejects author that does not match auth.token.name', async () => {
    const msg = { ...validMessage(), author: 'Someone Else' };
    await assertFails(set(ref(aliceDb(), 'messages/msg1'), msg));
  });
});

// ============================================================
// Rate limiting — users/$uid/lastPostTimestamp
// ============================================================
describe('rate limiting: users/$uid/lastPostTimestamp', () => {
  test('unauthenticated users cannot read user nodes', async () => {
    await assertFails(get(ref(anonDb(), 'users/uid-alice')));
  });

  test('users cannot read another user\'s node', async () => {
    await assertFails(get(ref(aliceDb(), 'users/uid-bob')));
  });

  test('users can set their own lastPostTimestamp (first post)', async () => {
    await assertSucceeds(set(ref(aliceDb(), 'users/uid-alice/lastPostTimestamp'), 1000000));
  });

  test('users cannot write another user\'s lastPostTimestamp', async () => {
    await assertFails(set(ref(aliceDb(), 'users/uid-bob/lastPostTimestamp'), 1000000));
  });

  test('rejects lastPostTimestamp within 5 seconds of previous (4999 ms gap)', async () => {
    await seedMessage('users/uid-alice/lastPostTimestamp', 1000000);
    await assertFails(set(ref(aliceDb(), 'users/uid-alice/lastPostTimestamp'), 1004999));
  });

  test('accepts lastPostTimestamp at exactly 5 seconds after previous (5000 ms gap)', async () => {
    await seedMessage('users/uid-alice/lastPostTimestamp', 1000000);
    await assertSucceeds(set(ref(aliceDb(), 'users/uid-alice/lastPostTimestamp'), 1005000));
  });

  test('rejects unknown fields on user node ($other)', async () => {
    await assertFails(set(ref(aliceDb(), 'users/uid-alice/extraField'), 'not allowed'));
  });
});

// ============================================================
// Display name alias — users/$uid/profile/displayName
// ============================================================
describe('display name alias: users/$uid/profile/displayName', () => {
  test('user can set their own display name alias', async () => {
    await assertSucceeds(set(ref(aliceDb(), 'users/uid-alice/profile/displayName'), 'CoolAlice'));
  });

  test('user cannot set another user\'s display name alias', async () => {
    await assertFails(set(ref(aliceDb(), 'users/uid-bob/profile/displayName'), 'Impersonator'));
  });

  test('unauthenticated user cannot set display name alias', async () => {
    await assertFails(set(ref(anonDb(), 'users/uid-alice/profile/displayName'), 'Hacker'));
  });

  test('accepts display name at exactly 40 characters', async () => {
    await assertSucceeds(set(ref(aliceDb(), 'users/uid-alice/profile/displayName'), 'A'.repeat(40)));
  });

  test('rejects display name over 40 characters', async () => {
    await assertFails(set(ref(aliceDb(), 'users/uid-alice/profile/displayName'), 'A'.repeat(41)));
  });

  test('rejects empty display name', async () => {
    await assertFails(set(ref(aliceDb(), 'users/uid-alice/profile/displayName'), ''));
  });

  test('rejects unknown fields under profile ($other)', async () => {
    await assertFails(set(ref(aliceDb(), 'users/uid-alice/profile/unknownField'), 'not allowed'));
  });

  test('user can delete their own display name alias', async () => {
    await seedMessage('users/uid-alice/profile/displayName', 'CoolAlice');
    await assertSucceeds(remove(ref(aliceDb(), 'users/uid-alice/profile/displayName')));
  });
});

// ============================================================
// Messages author — allows alias as author
// ============================================================
describe('messages: author field accepts stored alias', () => {
  test('accepts author matching stored alias', async () => {
    await seedMessage('users/uid-alice/profile/displayName', 'CoolAlias');
    const msg = { ...validMessage(), author: 'CoolAlias' };
    await assertSucceeds(set(ref(aliceDb(), 'messages/msg1'), msg));
  });

  test('rejects author that matches neither Google name nor alias', async () => {
    await seedMessage('users/uid-alice/profile/displayName', 'CoolAlias');
    const msg = { ...validMessage(), author: 'SomeRandomName' };
    await assertFails(set(ref(aliceDb(), 'messages/msg1'), msg));
  });
});

// ============================================================
// pollVotes — vote write rules
// ============================================================
describe('pollVotes: voting rules', () => {
  async function seedPollMessage(msgId, authorId) {
    await seedMessage(`messages/${msgId}`, {
      text: 'Pick one',
      author: 'Test User',
      authorId,
      timestamp: Date.now(),
      type: 'poll',
      poll: { options: { '0': 'Yes', '1': 'No' } },
    });
  }

  test('authenticated user can cast their own vote', async () => {
    await seedPollMessage('poll1', 'uid-alice');
    await assertSucceeds(set(ref(aliceDb(), 'pollVotes/poll1/uid-alice'), 0));
  });

  test('unauthenticated user cannot vote', async () => {
    await seedPollMessage('poll1', 'uid-alice');
    await assertFails(set(ref(anonDb(), 'pollVotes/poll1/some-uid'), 0));
  });

  test('user cannot vote as another user (uid mismatch)', async () => {
    await seedPollMessage('poll1', 'uid-alice');
    await assertFails(set(ref(aliceDb(), 'pollVotes/poll1/uid-bob'), 0));
  });

  test('user cannot change their vote (no-overwrite rule)', async () => {
    await seedMessage('pollVotes/poll1/uid-alice', 0);
    await assertFails(set(ref(aliceDb(), 'pollVotes/poll1/uid-alice'), 1));
  });

  test('vote value must be a number (rejects string)', async () => {
    await seedPollMessage('poll1', 'uid-alice');
    await assertFails(set(ref(aliceDb(), 'pollVotes/poll1/uid-alice'), 'yes'));
  });

  test('vote value must be 0–3 (rejects value 4)', async () => {
    await seedPollMessage('poll1', 'uid-alice');
    await assertFails(set(ref(aliceDb(), 'pollVotes/poll1/uid-alice'), 4));
  });

  test('vote value must be 0–3 (rejects negative value)', async () => {
    await seedPollMessage('poll1', 'uid-alice');
    await assertFails(set(ref(aliceDb(), 'pollVotes/poll1/uid-alice'), -1));
  });

  test('poll author can delete all votes for their poll', async () => {
    await seedPollMessage('poll1', 'uid-alice');
    await seedMessage('pollVotes/poll1/uid-bob', 0);
    await assertSucceeds(remove(ref(aliceDb(), 'pollVotes/poll1')));
  });

  test('non-author cannot delete poll votes', async () => {
    await seedPollMessage('poll1', 'uid-alice');
    await seedMessage('pollVotes/poll1/uid-alice', 0);
    await assertFails(remove(ref(bobDb(), 'pollVotes/poll1')));
  });
});

// ============================================================
// pollVotes — read access
// ============================================================
describe('pollVotes: read access', () => {
  test('unauthenticated users can read poll votes', async () => {
    await assertSucceeds(get(ref(anonDb(), 'pollVotes')));
  });

  test('authenticated users can read poll votes', async () => {
    await assertSucceeds(get(ref(aliceDb(), 'pollVotes')));
  });
});
