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
    email: '',
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
