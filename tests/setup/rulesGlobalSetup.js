'use strict';

const { spawn } = require('child_process');
const { createConnection } = require('net');
const { writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const path = require('path');

const DB_PORT = 9000;
const PROJECT_ID = 'demo-guestbook';
const PID_FILE = join(tmpdir(), 'guestbook-firebase-emulator.pid');
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const FIREBASE_BIN = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'firebase');

// Firebase emulator requires Java 21+. Try common installation paths.
const JAVA21_CANDIDATES = [
  '/usr/lib/jvm/temurin-21-jdk-amd64',
  '/usr/lib/jvm/java-21-openjdk-amd64',
  '/usr/lib/jvm/java-21',
  '/usr/local/lib/jvm/temurin-21',
];

function findJava21Home() {
  for (const dir of JAVA21_CANDIDATES) {
    if (existsSync(path.join(dir, 'bin', 'java'))) return dir;
  }
  return null;
}

function portIsOpen(port) {
  return new Promise(resolve => {
    const socket = createConnection({ port, host: 'localhost', timeout: 500 });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

module.exports = async function () {
  if (await portIsOpen(DB_PORT)) {
    writeFileSync(PID_FILE, 'external');
    return;
  }

  const java21Home = findJava21Home();
  const spawnEnv = { ...process.env };
  if (java21Home) {
    spawnEnv.JAVA_HOME = java21Home;
    spawnEnv.PATH = `${java21Home}/bin:${spawnEnv.PATH || ''}`;
  }

  const proc = spawn('node', [FIREBASE_BIN, 'emulators:start', '--only', 'database', '--project', PROJECT_ID], {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: spawnEnv,
  });

  writeFileSync(PID_FILE, String(proc.pid));

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Firebase emulator did not start within 90s'));
    }, 90000);

    proc.stdout.on('data', chunk => {
      if (chunk.toString().includes('All emulators ready')) {
        clearTimeout(timeout);
        proc.stdout.removeAllListeners();
        proc.stderr.removeAllListeners();
        proc.unref();
        resolve();
      }
    });

    proc.stderr.on('data', chunk => {
      process.stderr.write(chunk);
    });

    proc.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on('exit', code => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        reject(new Error(`Firebase emulator exited with code ${code}`));
      }
    });
  });
};
