// Run with: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { issueFor } from '../src/worker.js';

const env = {
  SITE_URL: 'https://sparkchamber.app',
  GITHUB_REPO: 'spark-chamber/spark-chamber-feedback',
  GITHUB_TOKEN: 'test-token',
  TURNSTILE_SECRET: 'test-secret',
};

let calls;
let turnstileOk;
let githubStatus;
beforeEach(() => {
  calls = [];
  turnstileOk = true;
  githubStatus = [201];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('turnstile')) return Response.json({ success: turnstileOk });
    return new Response('{}', { status: githubStatus.shift() ?? 201 });
  };
});

function post(fields) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  return worker.fetch(new Request('https://worker.example/', { method: 'POST', body }), env);
}
const valid = { kind: 'wrong-answer', message: 'Expected 3.3 V but I get 3.0 V', 'cf-turnstile-response': 'tok' };
const githubCalls = () => calls.filter((c) => c.url.startsWith('https://api.github.com'));

test('files a report and redirects to the thank-you page', async () => {
  const res = await post({ ...valid, topic: 'dividers', problem: 'div_design_pair', seed: '9', answer: '3.0 V', version: '0.2.0' });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback-sent.html');
  const [gh] = githubCalls();
  assert.equal(gh.url, 'https://api.github.com/repos/spark-chamber/spark-chamber-feedback/issues');
  assert.equal(gh.init.headers.authorization, 'Bearer test-token');
  const issue = JSON.parse(gh.init.body);
  assert.equal(issue.title, '[dividers] Expected 3.3 V but I get 3.0 V');
  assert.deepEqual(issue.labels, ['kind:wrong-answer', 'from:app', 'topic:dividers']);
  assert.match(issue.body, /\| Seed \| 9 \|/);
});

test('rejects a failed human check without filing', async () => {
  turnstileOk = false;
  const res = await post(valid);
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback.html?status=check');
  assert.equal(githubCalls().length, 0);
});

test('rejects a missing token, unknown kind or empty message', async () => {
  for (const bad of [{ ...valid, 'cf-turnstile-response': '' }, { ...valid, kind: 'spam' }, { ...valid, message: '   ' }]) {
    const res = await post(bad);
    assert.match(res.headers.get('location'), /feedback\.html\?status=(invalid|check)$/);
  }
  assert.equal(githubCalls().length, 0);
});

test('silently drops bot submissions that fill the hidden field', async () => {
  const res = await post({ ...valid, website: 'http://spam.example' });
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback-sent.html');
  assert.equal(calls.length, 0);
});

test('files without labels if GitHub refuses them', async () => {
  githubStatus = [422, 201];
  const res = await post(valid);
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback-sent.html');
  const [, retry] = githubCalls();
  assert.equal(JSON.parse(retry.init.body).labels, undefined);
});

test('reports an error page when GitHub fails', async () => {
  githubStatus = [500];
  const res = await post(valid);
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback.html?status=error');
});

test('only accepts POST', async () => {
  const res = await worker.fetch(new Request('https://worker.example/'), env);
  assert.equal(res.status, 405);
});

test('visitor text cannot ping people, reference issues or break the table', () => {
  const { title, body, labels } = issueFor({
    kind: 'other',
    message: '@owner see #12\nsecond line',
    details: { topic: 'Bad Topic!', answer: 'a | b' },
  });
  assert.ok(!/@owner/.test(title) && !/#12/.test(body));
  assert.match(body, /> second line/);
  assert.match(body, /a \\\| b/);
  assert.deepEqual(labels, ['kind:other', 'from:web']);
});

// A call that never answers on its own: it settles only when its signal
// aborts, and without a signal it never settles at all (as a stalled call).
const hang = (url, init) => {
  calls.push({ url: String(url), init });
  return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal.reason)));
};
const quick = { ...env, FETCH_TIMEOUT_MS: '50' };
// Node's AbortSignal.timeout doesn't keep the process alive (Workers keep the
// request alive themselves), so hold the test open until the request settles.
async function postWith(fields, envOverride) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  const keepAlive = setInterval(() => {}, 1000);
  try {
    return await worker.fetch(new Request('https://worker.example/', { method: 'POST', body }), envOverride);
  } finally {
    clearInterval(keepAlive);
  }
}

test('a stalled human check times out and sends the visitor back to check again', { timeout: 3000 }, async () => {
  globalThis.fetch = hang;
  const started = Date.now();
  const res = await postWith(valid, quick);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback.html?status=check');
  assert.ok(Date.now() - started < 2000);
  assert.equal(githubCalls().length, 0);
});

test('a stalled GitHub call times out and shows the error page', { timeout: 3000 }, async () => {
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('turnstile')) {
      calls.push({ url: String(url), init });
      return Response.json({ success: true });
    }
    return hang(url, init);
  };
  const started = Date.now();
  const res = await postWith(valid, quick);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback.html?status=error');
  assert.ok(Date.now() - started < 2000);
  assert.equal(githubCalls().length, 1);
});

test('both outside calls carry a time limit', async () => {
  await post(valid);
  assert.equal(calls.length, 2);
  for (const call of calls) assert.ok(call.init.signal instanceof AbortSignal, call.url);
});

// Collects console.log lines while a request runs.
async function logsOf(run) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(JSON.stringify(args));
  try {
    await run();
  } finally {
    console.log = original;
  }
  return lines.join('\n');
}
const secretText = { ...valid, message: 'PRIVATE-REPORT-TEXT', email: 'student@example.com', topic: 'dividers' };

test("logs GitHub's status and error message, never the report", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('turnstile')) return Response.json({ success: true });
    return Response.json({ message: 'Bad credentials' }, { status: 401 });
  };
  let res;
  const log = await logsOf(async () => (res = await post(secretText)));
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback.html?status=error');
  assert.match(log, /401/);
  assert.match(log, /Bad credentials/);
  for (const secret of ['PRIVATE-REPORT-TEXT', 'student@example.com', 'dividers', 'test-token']) assert.ok(!log.includes(secret), secret);
});

test("logs Turnstile's error codes, never the report", async () => {
  globalThis.fetch = async () => Response.json({ success: false, 'error-codes': ['invalid-input-secret'] });
  let res;
  const log = await logsOf(async () => (res = await post(secretText)));
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback.html?status=check');
  assert.match(log, /invalid-input-secret/);
  for (const secret of ['PRIVATE-REPORT-TEXT', 'student@example.com', 'dividers', 'test-secret', 'tok']) assert.ok(!log.includes(secret), secret);
});

test('a posted email address is ignored and never reaches the issue', async () => {
  const email = 'student@example.com';
  const res = await post({ ...valid, email, message: 'Expected 3.3 V' });
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback-sent.html');
  const [gh] = githubCalls();
  const sent = gh.init.body;
  assert.ok(!sent.includes(email), 'email in the issue');
  assert.ok(!/reply to/i.test(sent), 'reply line in the issue');
});

test('an overlong email field no longer rejects the report', async () => {
  const res = await post({ ...valid, email: 'x'.repeat(5000) });
  assert.equal(res.headers.get('location'), 'https://sparkchamber.app/feedback-sent.html');
  assert.ok(!githubCalls()[0].init.body.includes('xxxxxxxxxx'));
});

const getHealth = (envOverride = env) => worker.fetch(new Request('https://worker.example/health'), envOverride);

test('GET /health is ok when the token can read the feedback repo', async () => {
  const res = await getHealth();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/spark-chamber/spark-chamber-feedback');
  assert.equal(calls[0].init.headers.authorization, 'Bearer test-token');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('GET /health is 503 with only the GitHub status when the token fails', async () => {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ message: 'Bad credentials' }, { status: 401 });
  };
  let res;
  const log = await logsOf(async () => (res = await getHealth()));
  assert.equal(res.status, 503);
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), { ok: false, github: 401 });
  for (const secret of ['test-token', 'test-secret']) assert.ok(!text.includes(secret) && !log.includes(secret), secret);
  assert.match(log, /401/);
  assert.ok(!calls.some((c) => c.url.includes('turnstile') || c.url.endsWith('/issues')));
});

test('GET /health is 503 when GitHub stalls', { timeout: 3000 }, async () => {
  globalThis.fetch = hang;
  const keepAlive = setInterval(() => {}, 1000);
  try {
    const res = await getHealth({ ...env, FETCH_TIMEOUT_MS: '50' });
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false, github: 'unreachable' });
  } finally {
    clearInterval(keepAlive);
  }
});

test('GET on any other path is still 405', async () => {
  const res = await worker.fetch(new Request('https://worker.example/'), env);
  assert.equal(res.status, 405);
  assert.equal(calls.length, 0);
});
