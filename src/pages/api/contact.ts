import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

type ContactPayload = {
  submissionId: string;
  website: string;
  name: string;
  email: string;
  store: string;
  goal: string;
  priority: string;
  deadline: string;
};

const json = (body: object, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });

const readText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength + 1) : '';

const parsePayload = (value: unknown): ContactPayload | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;

  return {
    submissionId: readText(input.submissionId, 64),
    website: readText(input.website, 200),
    name: readText(input.name, 100),
    email: readText(input.email, 254).toLowerCase(),
    store: readText(input.store, 500),
    goal: readText(input.goal, 2000),
    priority: readText(input.priority, 200),
    deadline: readText(input.deadline, 100),
  };
};

const validate = (payload: ContactPayload) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.submissionId)) {
    return 'Please refresh the page and try again.';
  }
  if (payload.name.length < 2 || payload.name.length > 100) return 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 254) {
    return 'Please enter a valid work email.';
  }
  if (payload.goal.length < 10 || payload.goal.length > 2000) {
    return 'Please add a little more detail about what you want to improve.';
  }
  if (payload.priority.length > 200 || payload.deadline.length > 100) return 'One of the optional fields is too long.';

  try {
    const storeUrl = new URL(payload.store);
    if (!['http:', 'https:'].includes(storeUrl.protocol) || !storeUrl.hostname.includes('.')) throw new Error();
  } catch {
    return 'Please enter a valid Shopify store URL, including https://.';
  }

  return null;
};

const getClientKey = (request: Request) =>
  request.headers.get('cf-connecting-ip') ||
  request.headers.get('x-real-ip') ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  'unknown';

const isRateLimited = (clientKey: string) => {
  const now = Date.now();

  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }

  const current = attempts.get(clientKey);
  if (!current) {
    attempts.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
};

export const POST: APIRoute = async ({ request }) => {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return json({ message: 'Request origin was not accepted.' }, 403);
  }

  const contentType = request.headers.get('content-type') || '';
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (!contentType.includes('application/json')) {
    return json({ message: 'Content type must be application/json.' }, 415);
  }
  if (contentLength > MAX_BODY_BYTES) return json({ message: 'Request is too large.' }, 413);
  if (isRateLimited(getClientKey(request))) {
    return json({ message: 'Too many requests. Please wait a few minutes and try again.' }, 429, {
      'Retry-After': String(RATE_LIMIT_WINDOW_MS / 1000),
    });
  }

  let rawBody = '';
  try {
    rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) throw new Error('too_large');
  } catch {
    return json({ message: 'Request is too large.' }, 413);
  }

  let payload: ContactPayload | null = null;
  try {
    payload = parsePayload(JSON.parse(rawBody));
  } catch {
    return json({ message: 'Request body is not valid JSON.' }, 400);
  }
  if (!payload) return json({ message: 'Request body is invalid.' }, 400);

  // Silently accept the honeypot so automated submissions receive no useful signal.
  if (payload.website) return json({ message: 'Request sent. North/Shop will reply shortly.' });

  const validationError = validate(payload);
  if (validationError) return json({ message: validationError }, 422);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.RESEND_TO_EMAIL;
  if (!apiKey || !from || !to) {
    console.error('Resend contact form is missing required server environment variables.');
    return json({ message: 'Email service is temporarily unavailable. Please try again later.' }, 503);
  }

  const storeUrl = new URL(payload.store);
  const resend = new Resend(apiKey);
  const message = [
    'New Shopify store review request',
    '',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Store: ${storeUrl.toString()}`,
    `Priority product: ${payload.priority || 'Not specified'}`,
    `Deadline: ${payload.deadline || 'Not specified'}`,
    '',
    'What they want to improve:',
    payload.goal,
  ].join('\n');

  try {
    const { data, error } = await resend.emails.send(
      {
        from,
        to: [to],
        replyTo: payload.email,
        subject: `Store review request — ${storeUrl.hostname}`,
        text: message,
        tags: [{ name: 'source', value: 'northshop-contact-form' }],
      },
      { idempotencyKey: `store-review/${payload.submissionId}` },
    );

    if (error || !data?.id) {
      console.error('Resend rejected a contact form request.', { type: error?.name });
      return json({ message: 'We could not send your request. Please try again.' }, 502);
    }

    return json({ message: 'Request sent. North/Shop will reply shortly.' }, 201);
  } catch (error) {
    console.error('Resend contact form request failed.', {
      type: error instanceof Error ? error.name : 'UnknownError',
    });
    return json({ message: 'We could not send your request. Please try again.' }, 502);
  }
};

export const ALL: APIRoute = () =>
  json({ message: 'Method not allowed.' }, 405, {
    Allow: 'POST',
  });
