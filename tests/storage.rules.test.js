/**
 * @jest-environment node
 */

'use strict';

const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { ref, uploadBytes, deleteObject, getDownloadURL } = require('firebase/storage');
const { readFileSync } = require('fs');
const path = require('path');

const PROJECT_ID = 'demo-guestbook';
const STORAGE_HOST = 'localhost';
const STORAGE_PORT = 9199;

let testEnv;

beforeAll(async () => {
  const rules = readFileSync(path.resolve(__dirname, '../storage.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { host: STORAGE_HOST, port: STORAGE_PORT, rules },
  });
}, 30000);

afterAll(async () => {
  await testEnv?.cleanup();
});

function googleStorage(uid) {
  return testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: 'google.com' },
  }).storage();
}

function anonymousStorage(uid) {
  return testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: 'anonymous' },
  }).storage();
}

function unauthStorage() {
  return testEnv.unauthenticatedContext().storage();
}

async function seedFile(storagePath, data, metadata) {
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await uploadBytes(ref(ctx.storage(), storagePath), data, metadata);
  });
}

const SMALL_IMAGE = new Uint8Array(100);
const SMALL_AUDIO = new Uint8Array(100);

// ============================================================
// message-images — read access
// ============================================================
describe('message-images: read access', () => {
  beforeAll(async () => {
    await seedFile('message-images/uid-alice/photo.jpg', SMALL_IMAGE, { contentType: 'image/jpeg' });
  });

  test('unauthenticated users can read message images', async () => {
    await assertSucceeds(getDownloadURL(ref(unauthStorage(), 'message-images/uid-alice/photo.jpg')));
  });

  test('authenticated users can read message images', async () => {
    await assertSucceeds(getDownloadURL(ref(googleStorage('uid-alice'), 'message-images/uid-alice/photo.jpg')));
  });
});

// ============================================================
// message-images — write access
// ============================================================
describe('message-images: write access', () => {
  test('unauthenticated users cannot upload message images', async () => {
    await assertFails(
      uploadBytes(ref(unauthStorage(), 'message-images/uid-alice/photo.jpg'), SMALL_IMAGE, { contentType: 'image/jpeg' })
    );
  });

  test('authenticated user can upload a valid image', async () => {
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'message-images/uid-alice/photo.jpg'), SMALL_IMAGE, { contentType: 'image/jpeg' })
    );
  });

  test('authenticated user cannot upload to another user path', async () => {
    await assertFails(
      uploadBytes(ref(googleStorage('uid-bob'), 'message-images/uid-alice/photo.jpg'), SMALL_IMAGE, { contentType: 'image/jpeg' })
    );
  });

  test('rejects image with wrong content type (text/plain)', async () => {
    await assertFails(
      uploadBytes(ref(googleStorage('uid-alice'), 'message-images/uid-alice/doc.txt'), SMALL_IMAGE, { contentType: 'text/plain' })
    );
  });

  test('rejects image with audio content type', async () => {
    await assertFails(
      uploadBytes(ref(googleStorage('uid-alice'), 'message-images/uid-alice/audio.mp3'), SMALL_IMAGE, { contentType: 'audio/mpeg' })
    );
  });

  test('accepts image/png content type', async () => {
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'message-images/uid-alice/photo.png'), SMALL_IMAGE, { contentType: 'image/png' })
    );
  });

  test('accepts image/webp content type', async () => {
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'message-images/uid-alice/photo.webp'), SMALL_IMAGE, { contentType: 'image/webp' })
    );
  });

  test('rejects image exceeding 5 MB size limit', async () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    await assertFails(
      uploadBytes(ref(googleStorage('uid-alice'), 'message-images/uid-alice/big.jpg'), oversized, { contentType: 'image/jpeg' })
    );
  }, 15000);

  test('accepts image at exactly 5 MB', async () => {
    const atLimit = new Uint8Array(5 * 1024 * 1024);
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'message-images/uid-alice/exact.jpg'), atLimit, { contentType: 'image/jpeg' })
    );
  }, 15000);
});

// ============================================================
// message-images — delete access
// ============================================================
describe('message-images: delete access', () => {
  beforeEach(async () => {
    await seedFile('message-images/uid-alice/to-delete.jpg', SMALL_IMAGE, { contentType: 'image/jpeg' });
  });

  test('owner can delete their own image', async () => {
    await assertSucceeds(deleteObject(ref(googleStorage('uid-alice'), 'message-images/uid-alice/to-delete.jpg')));
  });

  test('other user cannot delete an image', async () => {
    await assertFails(deleteObject(ref(googleStorage('uid-bob'), 'message-images/uid-alice/to-delete.jpg')));
  });

  test('unauthenticated user cannot delete an image', async () => {
    await assertFails(deleteObject(ref(unauthStorage(), 'message-images/uid-alice/to-delete.jpg')));
  });
});

// ============================================================
// voice-messages — read access
// ============================================================
describe('voice-messages: read access', () => {
  beforeAll(async () => {
    await seedFile('voice-messages/uid-alice/voice.ogg', SMALL_AUDIO, { contentType: 'audio/ogg' });
  });

  test('unauthenticated users can read voice messages', async () => {
    await assertSucceeds(getDownloadURL(ref(unauthStorage(), 'voice-messages/uid-alice/voice.ogg')));
  });

  test('authenticated users can read voice messages', async () => {
    await assertSucceeds(getDownloadURL(ref(googleStorage('uid-alice'), 'voice-messages/uid-alice/voice.ogg')));
  });
});

// ============================================================
// voice-messages — write access
// ============================================================
describe('voice-messages: write access', () => {
  test('unauthenticated users cannot upload voice messages', async () => {
    await assertFails(
      uploadBytes(ref(unauthStorage(), 'voice-messages/uid-alice/voice.ogg'), SMALL_AUDIO, { contentType: 'audio/ogg' })
    );
  });

  test('anonymous users cannot upload voice messages', async () => {
    await assertFails(
      uploadBytes(ref(anonymousStorage('uid-anon'), 'voice-messages/uid-anon/voice.ogg'), SMALL_AUDIO, { contentType: 'audio/ogg' })
    );
  });

  test('authenticated non-anonymous user can upload a valid voice message', async () => {
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'voice-messages/uid-alice/voice.ogg'), SMALL_AUDIO, { contentType: 'audio/ogg' })
    );
  });

  test('authenticated user cannot upload to another user voice path', async () => {
    await assertFails(
      uploadBytes(ref(googleStorage('uid-bob'), 'voice-messages/uid-alice/voice.ogg'), SMALL_AUDIO, { contentType: 'audio/ogg' })
    );
  });

  test('rejects voice message with image content type', async () => {
    await assertFails(
      uploadBytes(ref(googleStorage('uid-alice'), 'voice-messages/uid-alice/voice.jpg'), SMALL_AUDIO, { contentType: 'image/jpeg' })
    );
  });

  test('accepts audio/mpeg content type for voice messages', async () => {
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'voice-messages/uid-alice/voice.mp3'), SMALL_AUDIO, { contentType: 'audio/mpeg' })
    );
  });

  test('rejects voice message exceeding 2 MB size limit', async () => {
    const oversized = new Uint8Array(2 * 1024 * 1024 + 1);
    await assertFails(
      uploadBytes(ref(googleStorage('uid-alice'), 'voice-messages/uid-alice/big.ogg'), oversized, { contentType: 'audio/ogg' })
    );
  }, 15000);

  test('accepts voice message at exactly 2 MB', async () => {
    const atLimit = new Uint8Array(2 * 1024 * 1024);
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'voice-messages/uid-alice/exact.ogg'), atLimit, { contentType: 'audio/ogg' })
    );
  }, 15000);
});

// ============================================================
// voice-messages — delete access
// ============================================================
describe('voice-messages: delete access', () => {
  beforeEach(async () => {
    await seedFile('voice-messages/uid-alice/to-delete.ogg', SMALL_AUDIO, { contentType: 'audio/ogg' });
  });

  test('owner can delete their own voice message', async () => {
    await assertSucceeds(deleteObject(ref(googleStorage('uid-alice'), 'voice-messages/uid-alice/to-delete.ogg')));
  });

  test('other user cannot delete a voice message', async () => {
    await assertFails(deleteObject(ref(googleStorage('uid-bob'), 'voice-messages/uid-alice/to-delete.ogg')));
  });

  test('unauthenticated user cannot delete a voice message', async () => {
    await assertFails(deleteObject(ref(unauthStorage(), 'voice-messages/uid-alice/to-delete.ogg')));
  });
});

// ============================================================
// avatars — read access
// ============================================================
describe('avatars: read access', () => {
  beforeAll(async () => {
    await seedFile('avatars/uid-alice', SMALL_IMAGE, { contentType: 'image/jpeg' });
  });

  test('unauthenticated users can read avatars', async () => {
    await assertSucceeds(getDownloadURL(ref(unauthStorage(), 'avatars/uid-alice')));
  });

  test('authenticated users can read avatars', async () => {
    await assertSucceeds(getDownloadURL(ref(googleStorage('uid-alice'), 'avatars/uid-alice')));
  });
});

// ============================================================
// avatars — write access
// ============================================================
describe('avatars: write access', () => {
  test('unauthenticated users cannot upload avatars', async () => {
    await assertFails(
      uploadBytes(ref(unauthStorage(), 'avatars/uid-alice'), SMALL_IMAGE, { contentType: 'image/jpeg' })
    );
  });

  test('authenticated user can upload their own avatar', async () => {
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'avatars/uid-alice'), SMALL_IMAGE, { contentType: 'image/jpeg' })
    );
  });

  test('authenticated user cannot upload avatar for another user', async () => {
    await assertFails(
      uploadBytes(ref(googleStorage('uid-bob'), 'avatars/uid-alice'), SMALL_IMAGE, { contentType: 'image/jpeg' })
    );
  });

  test('rejects avatar with wrong content type (audio/mpeg)', async () => {
    await assertFails(
      uploadBytes(ref(googleStorage('uid-alice'), 'avatars/uid-alice'), SMALL_IMAGE, { contentType: 'audio/mpeg' })
    );
  });

  test('accepts image/png avatar', async () => {
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'avatars/uid-alice'), SMALL_IMAGE, { contentType: 'image/png' })
    );
  });

  test('accepts image/webp avatar', async () => {
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'avatars/uid-alice'), SMALL_IMAGE, { contentType: 'image/webp' })
    );
  });

  test('rejects avatar exceeding 2 MB size limit', async () => {
    const oversized = new Uint8Array(2 * 1024 * 1024 + 1);
    await assertFails(
      uploadBytes(ref(googleStorage('uid-alice'), 'avatars/uid-alice'), oversized, { contentType: 'image/jpeg' })
    );
  }, 15000);

  test('accepts avatar at exactly 2 MB', async () => {
    const atLimit = new Uint8Array(2 * 1024 * 1024);
    await assertSucceeds(
      uploadBytes(ref(googleStorage('uid-alice'), 'avatars/uid-alice'), atLimit, { contentType: 'image/jpeg' })
    );
  }, 15000);
});

// ============================================================
// avatars — delete access
// ============================================================
describe('avatars: delete access', () => {
  beforeEach(async () => {
    await seedFile('avatars/uid-alice', SMALL_IMAGE, { contentType: 'image/jpeg' });
  });

  test('owner can delete their own avatar', async () => {
    await assertSucceeds(deleteObject(ref(googleStorage('uid-alice'), 'avatars/uid-alice')));
  });

  test('other user cannot delete an avatar', async () => {
    await assertFails(deleteObject(ref(googleStorage('uid-bob'), 'avatars/uid-alice')));
  });

  test('unauthenticated user cannot delete an avatar', async () => {
    await assertFails(deleteObject(ref(unauthStorage(), 'avatars/uid-alice')));
  });
});
