// Receives the feedback form on sparkchamber.app and files each report as an
// issue in the private feedback repository. Nothing else is stored: no IP
// address, no cookies. Secrets: TURNSTILE_SECRET, GITHUB_TOKEN.
// Vars: SITE_URL, GITHUB_REPO (owner/name); optional FETCH_TIMEOUT_MS.

export const KINDS = {
  'wrong-answer': 'The expected answer looks wrong',
  'marked-wrong': 'My correct answer was marked wrong',
  unclear: 'The question or explanation is unclear',
  drawing: 'A drawing or the simulator looks wrong',
  bug: 'The app misbehaves or crashes',
  idea: 'An idea or request',
  other: 'Something else',
};

// Problem details the app passes along; each is a short, plain value.
const DETAILS = {
  topic: 'Topic',
  problem: 'Problem',
  seed: 'Seed',
  answer: 'Your answer',
  expected: 'Expected answer',
  version: 'App version',
};

const LIMITS = { message: 5000, detail: 200 };

// How long to wait for Turnstile, and for GitHub, before giving up. Without a
// limit, a stalled call keeps the visitor's browser loading forever; with it,
// they land back on the form with a message (status=check or status=error).
const FETCH_TIMEOUT_MS = 8000;
const timeout = (env) => AbortSignal.timeout(Number(env.FETCH_TIMEOUT_MS) || FETCH_TIMEOUT_MS);

export default {
  async fetch(request, env) {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') return health(env);
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let form;
    try {
      form = await request.formData();
    } catch {
      return back(env, 'invalid');
    }
    const field = (name) => String(form.get(name) ?? '').trim();

    // Bots fill the hidden field; people never see it.
    if (field('website')) return back(env, 'sent');

    const kind = field('kind');
    const message = field('message');
    // No email address is asked for or kept (owner, 2026-10-03); any posted
    // `email` field is ignored.
    if (!(kind in KINDS) || !message || message.length > LIMITS.message) {
      return back(env, 'invalid');
    }
    if (!(await humanCheck(field('cf-turnstile-response'), env))) return back(env, 'check');

    const details = {};
    for (const key of Object.keys(DETAILS)) {
      const value = field(key).slice(0, LIMITS.detail);
      if (value) details[key] = value;
    }
    const ok = await fileIssue({ kind, message, details }, env);
    return back(env, ok ? 'sent' : 'error');
  },
};

async function humanCheck(token, env) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: timeout(env),
    });
    const data = await res.json();
    if (data.success === true) return true;
    // Turnstile's own codes only (for example invalid-input-secret); nothing from the report.
    console.log('turnstile rejected', { status: res.status, errors: data['error-codes'] ?? [] });
    return false;
  } catch (err) {
    console.log('turnstile unreachable', { error: err?.name ?? 'Error' });
    return false;
  }
}

export function issueFor({ kind, message, details }) {
  const firstLine = message.split('\n')[0];
  const summary = firstLine.length > 70 ? `${firstLine.slice(0, 67)}...` : firstLine;
  const title = details.topic ? `[${details.topic}] ${summary}` : summary;

  const lines = [`**Kind:** ${KINDS[kind]}`, '', '**What happened**', '', quote(message), ''];
  const rows = Object.entries(details).map(([key, value]) => `| ${DETAILS[key]} | ${cell(value)} |`);
  if (rows.length) lines.push('**Problem details (from the app)**', '', '| Field | Value |', '|---|---|', ...rows, '');
  lines.push('_Sent with the feedback form on sparkchamber.app._');

  const labels = [`kind:${kind}`, details.seed ? 'from:app' : 'from:web'];
  if (details.topic && /^[a-z0-9_]{1,60}$/.test(details.topic)) labels.push(`topic:${details.topic}`);
  return { title: neutralize(title), body: lines.join('\n'), labels };
}

async function fileIssue(report, env) {
  const issue = issueFor(report);
  // One limit for both tries, so a retry can't double the wait.
  const signal = timeout(env);
  const post = (payload) =>
    fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: { ...githubHeaders(env), 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  try {
    let res = await post(issue);
    // If a label can't be applied, file the report anyway rather than lose it.
    if (res.status === 422) res = await post({ title: issue.title, body: issue.body });
    if (!res.ok) await logGithubFailure(res);
    return res.ok;
  } catch (err) {
    console.log('github unreachable', { error: err?.name ?? 'Error' });
    return false;
  }
}

function githubHeaders(env) {
  return {
    authorization: `Bearer ${env.GITHUB_TOKEN}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'spark-chamber-feedback-worker',
    'x-github-api-version': '2022-11-28',
  };
}

// GET /health, for the check every other week in .github/workflows/feedback-health.yml:
// can the token still reach the feedback repo? It touches neither Turnstile
// nor the issues, and the answer carries only GitHub's status code.
//
// /health is public and each check spends one GitHub API call on the
// feedback token, so the answer (good or bad) is reused for 5 minutes in
// this isolate. Hammering it can't drain the token's rate limit and block
// real reports.
const HEALTH_CACHE_MS = 5 * 60 * 1000;
let lastHealth = null; // { at, status, body }
export function resetHealthCache() {
  lastHealth = null;
}

async function health(env) {
  if (!lastHealth || Date.now() - lastHealth.at >= HEALTH_CACHE_MS) {
    lastHealth = { at: Date.now(), ...(await checkGithub(env)) };
  }
  return new Response(JSON.stringify(lastHealth.body), {
    status: lastHealth.status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function checkGithub(env) {
  try {
    const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}`, {
      headers: githubHeaders(env),
      signal: timeout(env),
    });
    if (res.ok) return { status: 200, body: { ok: true } };
    await logGithubFailure(res);
    return { status: 503, body: { ok: false, github: res.status } };
  } catch (err) {
    console.log('github unreachable', { error: err?.name ?? 'Error' });
    return { status: 503, body: { ok: false, github: 'unreachable' } };
  }
}

// GitHub's status and its error message (for example "Bad credentials" or
// "Resource not accessible by personal access token"), for the Worker's log.
// Nothing from the report itself is logged.
async function logGithubFailure(res) {
  let message = '';
  try {
    message = String((await res.json())?.message ?? '').slice(0, 200);
  } catch {}
  console.log('github rejected', { status: res.status, message });
}

// Visitors' text goes into the issue as quoted text that can't ping people,
// close issues or break the table.
function neutralize(text) {
  return text.replace(/@/g, '@​').replace(/#(\d)/g, '#​$1');
}
function quote(text) {
  return neutralize(text)
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}
function cell(text) {
  return neutralize(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function back(env, status) {
  const page = status === 'sent' ? 'feedback-sent.html' : `feedback.html?status=${status}`;
  return Response.redirect(`${env.SITE_URL}/${page}`, 303);
}
