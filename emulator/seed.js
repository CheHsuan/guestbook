const admin = require('firebase-admin');

// Initialize Firebase Admin with emulator
process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
admin.initializeApp({
  projectId: 'guestbook-3c7eb',
  databaseURL: 'http://127.0.0.1:9000?ns=guestbook-3c7eb-default-rtdb'
});

const db = admin.database();

async function seedData() {
  console.log('Clearing old messages...');
  await db.ref('messages').remove();

  console.log('Seeding 250 messages...');
  const now = Date.now();

  for (let i = 1; i <= 250; i++) {
    let timestamp;
    if (i <= 100) {
      // First 100 messages are from 2 days ago (older than 24 hours)
      timestamp = now - (2 * 24 * 60 * 60 * 1000) - (100 - i) * 1000 * 60;
    } else {
      // Remaining 150 messages are from within the last 24 hours (1 min apart)
      timestamp = now - (250 - i) * 1000 * 60;
    }

    await db.ref('messages').push({
      author: `User ${i}`,
      authorId: `author_${i}`,
      text: `This is a generated test message number ${i} to test the infinite scrolling feature.`,
      timestamp: timestamp
    });
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seedData().catch(console.error);
