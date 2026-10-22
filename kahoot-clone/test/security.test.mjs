import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dbService, getDatabase } from '../frontend/api/_lib/db.js';
import { newGame, joinPlayer, submitAnswer } from '../frontend/api/_lib/engine.js';
import presentationsHandler from '../frontend/api/presentations.js';
import joinGameHandler from '../frontend/api/join-game.js';
import sendReactionHandler from '../frontend/api/send-reaction.js';

let passed = 0;
function ok(title, condition) {
  assert.ok(condition, title);
  console.log(`  ok - ${title}`);
  passed++;
}

function makeMockReq(method, { query = {}, body = null, headers = {} } = {}) {
  const chunks = body !== undefined && body !== null ? [Buffer.from(JSON.stringify(body))] : [];
  return {
    method,
    headers: { ...headers },
    query,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
}

function makeMockRes() {
  let statusCode = 200;
  const headers = {};
  let body = '';
  return {
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    get statusCode() { return statusCode; },
    set statusCode(c) { statusCode = c; },
    end(data) {
      if (data) body += data;
    },
    get json() {
      try { return JSON.parse(body); } catch { return null; }
    }
  };
}

async function callHandler(handler, req) {
  const res = makeMockRes();
  await handler(req, res);
  return res;
}

console.log('--- RUNNING SECURITY VERIFICATION TESTS ---\n');

// 1. IDOR Prevention Tests
console.log('1. IDOR & Authentication Barrier Tests');
{
  const resNoAuth = await callHandler(presentationsHandler, makeMockReq('GET', { query: { id: 'test-quiz-1' } }));
  ok('Unauthenticated GET /api/presentations?id=... rejected with 401', resNoAuth.statusCode === 401);

  const resListNoAuth = await callHandler(presentationsHandler, makeMockReq('GET'));
  ok('Unauthenticated GET /api/presentations rejected with 401', resListNoAuth.statusCode === 401);

  const resPostNoAuth = await callHandler(presentationsHandler, makeMockReq('POST', { body: { id: 'x', title: 'test' } }));
  ok('Unauthenticated POST /api/presentations rejected with 401', resPostNoAuth.statusCode === 401);

  const resDelNoAuth = await callHandler(presentationsHandler, makeMockReq('DELETE', { query: { id: 'x' } }));
  ok('Unauthenticated DELETE /api/presentations rejected with 401', resDelNoAuth.statusCode === 401);
}

// 2. BOLA (Broken Object Level Authorization) Database Isolation Tests
console.log('\n2. BOLA & Cross-User Data Isolation Tests');
{
  const userA = 'user-google-alice';
  const userB = 'user-google-bob';
  const quizId = 'alice-secret-exam';

  // Seed users
  dbService.upsertUser({ id: userA, email: 'alice@example.com', name: 'Alice' });
  dbService.upsertUser({ id: userB, email: 'bob@example.com', name: 'Bob' });

  // Seed User A's quiz
  dbService.savePresentation(userA, {
    id: quizId,
    title: 'Alice Private Exam',
    slides: [{ question: 'What is 2+2?', answers: [] }]
  });

  // Verify User A can read it
  const aliceRead = dbService.getPresentation(quizId, userA);
  ok('User A can access own presentation', aliceRead !== null && aliceRead.title === 'Alice Private Exam');

  // Verify User B CANNOT read User A's presentation
  const bobRead = dbService.getPresentation(quizId, userB);
  ok('User B cannot access User A presentation (returns null)', bobRead === null);

  // Verify User B CANNOT overwrite User A's presentation
  let overwriteBlocked = false;
  try {
    dbService.savePresentation(userB, {
      id: quizId,
      title: 'Hacked by Bob',
      slides: []
    });
  } catch (err) {
    overwriteBlocked = err.statusCode === 403;
  }
  ok('User B cannot overwrite User A presentation (throws 403 Forbidden)', overwriteBlocked);

  // Verify Alice quiz was not modified
  const verifyAlice = dbService.getPresentation(quizId, userA);
  ok('Alice presentation remains intact and untampered', verifyAlice.title === 'Alice Private Exam');
}

// 3. Gameplay Anti-Cheat (Answer Locking) Tests
console.log('\n3. Gameplay Anti-Cheat & Answer Lock Tests');
{
  const game = newGame('123456', 'host-1', [
    { text: 'Sample Q', choices: ['A', 'B'], correctAnswers: [0], timeLimit: 30 }
  ], Date.now());

  game.status = 'QUESTION_ACTIVE';
  const playerId = 'player-1';
  game.players[playerId] = { id: playerId, nickname: 'Cheater', score: 0 };
  game.players['player-2'] = { id: 'player-2', nickname: 'Honest', score: 0 };

  // First answer submission
  submitAnswer(game, playerId, 0, Date.now());
  ok('First answer accepted', game.answers[playerId]?.choice === 0);

  // Second answer submission attempt on the same question while still active
  let secondAnswerBlocked = false;
  try {
    submitAnswer(game, playerId, 1, Date.now());
  } catch (err) {
    secondAnswerBlocked = err.statusCode === 400 && err.message.includes('already submitted');
  }
  ok('Second answer submission rejected (prevents answer flipping / race)', secondAnswerBlocked);
  ok('Original answer preserved', game.answers[playerId]?.choice === 0);
}

// 4. Input Sanitization Tests
console.log('\n4. Input Sanitization Tests');
{
  // Test join-game HTML sanitization
  const resJoin = await callHandler(joinGameHandler, makeMockReq('POST', {
    body: { pin: '000000', nickname: '<script>alert("xss")</script>Player' }
  }));
  // Even if game is not found (404), check that empty or bad nickname without text is rejected
  const resBadNick = await callHandler(joinGameHandler, makeMockReq('POST', {
    body: { pin: '000000', nickname: '<>' }
  }));
  ok('Stripping script brackets rejects empty sanitized nickname', resBadNick.statusCode === 400);

  // Test send-reaction input validation
  const resReactionBad = await callHandler(sendReactionHandler, makeMockReq('POST', {
    body: { pin: '000000', emoji: '' }
  }));
  ok('Empty emoji rejected with 400', resReactionBad.statusCode === 400);
}

// 5. Hardcoded Credentials & Secrets Verification
console.log('\n5. Hardcoded Secrets Verification in Config Files');
{
  const dockerComposeContent = fs.readFileSync('docker-compose.yml', 'utf8');
  ok('docker-compose.yml uses ${GOOGLE_CLIENT_ID}', dockerComposeContent.includes('${GOOGLE_CLIENT_ID}'));
  ok('docker-compose.yml uses ${VITE_GOOGLE_CLIENT_ID}', dockerComposeContent.includes('${VITE_GOOGLE_CLIENT_ID}'));
  ok('docker-compose.yml contains no hardcoded Google Client ID', !dockerComposeContent.includes('380819757900-'));

  const dockerfileContent = fs.readFileSync('frontend/Dockerfile', 'utf8');
  ok('frontend/Dockerfile contains no hardcoded Google Client ID', !dockerfileContent.includes('380819757900-'));

  const authJsContent = fs.readFileSync('frontend/src/lib/auth.js', 'utf8');
  ok('frontend/src/lib/auth.js contains no hardcoded Google Client ID', !authJsContent.includes('380819757900-'));
}

console.log(`\nAll ${passed} security test assertions passed successfully! 🛡️✅`);
