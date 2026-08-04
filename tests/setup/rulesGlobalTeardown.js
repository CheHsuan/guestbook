'use strict';

const { existsSync, readFileSync, unlinkSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const PID_FILE = join(tmpdir(), 'guestbook-firebase-emulator.pid');

module.exports = async function () {
  if (!existsSync(PID_FILE)) return;

  const content = readFileSync(PID_FILE, 'utf8').trim();
  unlinkSync(PID_FILE);

  if (content === 'external') return;

  const pid = parseInt(content, 10);
  if (isNaN(pid)) return;

  try {
    process.kill(-pid, 'SIGTERM');
  } catch (_) {
    // Process may have already exited
  }
};
