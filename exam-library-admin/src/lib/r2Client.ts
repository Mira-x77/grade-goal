/**
 * Minimal Cloudflare R2 client for the admin SPA.
 *
 * The admin has no backend, so signature V4 is computed in the browser with
 * WebCrypto (`crypto.subtle`). That is only possible because the app is served
 * from a secure context (https, or http://localhost / 127.0.0.1).
 *
 * ⚠️ The R2 secret key ends up in the bundle. This is acceptable only while the
 * admin is a local tool. If it is ever deployed publicly, move uploads behind a
 * Worker that holds the credentials server-side.
 */

const ACCOUNT_ID = (import.meta.env.VITE_R2_ACCOUNT_ID || '').trim();
const ACCESS_KEY_ID = (import.meta.env.VITE_R2_ACCESS_KEY_ID || '').trim();
const SECRET_ACCESS_KEY = (import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '').trim();
const BUCKET = (import.meta.env.VITE_R2_BUCKET || 'gostudy').trim();
const PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');

const REGION = 'auto';
const SERVICE = 's3';

export function isR2Configured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && PUBLIC_URL);
}

export function getR2Diagnostics() {
  return {
    configured: isR2Configured(),
    accountId: ACCOUNT_ID ? `${ACCOUNT_ID.slice(0, 6)}…` : '(missing)',
    bucket: BUCKET,
    publicUrl: PUBLIC_URL || '(missing)',
    hasAccessKey: Boolean(ACCESS_KEY_ID),
    hasSecretKey: Boolean(SECRET_ACCESS_KEY),
  };
}

function endpoint(): string {
  return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

/** Public URL for an object key. Mirrors how the app builds `file_url`. */
export function r2PublicUrl(key: string): string {
  return `${PUBLIC_URL}/${encodeKeyForUrl(key)}`;
}

/** Extract the object key from an R2 public URL, or null when it is not ours. */
export function r2KeyFromUrl(url: string | null | undefined): string | null {
  if (!url || !PUBLIC_URL) return null;
  if (!url.startsWith(PUBLIC_URL + '/')) return null;
  const raw = url.slice(PUBLIC_URL.length + 1).split('?')[0].split('#')[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/* ------------------------------------------------------------------ */
/* SigV4                                                               */
/* ------------------------------------------------------------------ */

const textEncoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(data: BufferSource | string): Promise<string> {
  const bytes = typeof data === 'string' ? textEncoder.encode(data) : data;
  return toHex(await crypto.subtle.digest('SHA-256', bytes));
}

async function hmac(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(data));
}

async function signingKey(dateStamp: string): Promise<ArrayBuffer> {
  const kDate = await hmac(textEncoder.encode(`AWS4${SECRET_ACCESS_KEY}`), dateStamp);
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

/** RFC 3986 encoding of a key path: slashes stay literal, everything else escaped. */
function encodeKeyPath(key: string): string {
  return key
    .split('/')
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join('/');
}

function encodeKeyForUrl(key: string): string {
  return encodeKeyPath(key);
}

interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

async function sign(
  method: 'PUT' | 'DELETE' | 'HEAD',
  key: string,
  payloadHash: string,
): Promise<SignedRequest> {
  const url = new URL(`${endpoint()}/${BUCKET}/${encodeKeyPath(key)}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    method,
    url.pathname,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signature = toHex(await hmac(await signingKey(dateStamp), stringToSign));

  return {
    url: url.toString(),
    headers: {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY_ID}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

function assertConfigured() {
  if (!isR2Configured()) {
    throw new Error(
      'R2 is not configured. Add VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, ' +
        'VITE_R2_SECRET_ACCESS_KEY and VITE_R2_PUBLIC_URL to exam-library-admin/.env ' +
        '(then restart the dev server).',
    );
  }
}

async function describeFailure(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
  const message = body.match(/<Message>([^<]+)<\/Message>/)?.[1];
  if (code || message) return `${response.status} ${[code, message].filter(Boolean).join(': ')}`;
  return `${response.status} ${response.statusText}`.trim();
}

export interface R2UploadOptions {
  contentType?: string;
  cacheControl?: string;
  onProgress?: (percent: number) => void;
}

/**
 * PUT an object into the bucket. Returns its public URL.
 * `key` is the exact same relative path the Supabase bucket would have used, so
 * a future domain swap keeps working.
 */
export async function r2Upload(
  key: string,
  file: File | Blob,
  options: R2UploadOptions = {},
): Promise<string> {
  assertConfigured();

  const payloadHash = await sha256Hex(await file.arrayBuffer());
  const { url, headers } = await sign('PUT', key, payloadHash);

  const contentType =
    options.contentType || (file.type && file.type !== '' ? file.type : guessContentType(key));

  const sendHeaders: Record<string, string> = {
    ...headers,
    'Content-Type': contentType,
  };
  if (options.cacheControl) sendHeaders['Cache-Control'] = options.cacheControl;

  // XHR (not fetch) so the UI can show real upload progress.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    Object.entries(sendHeaders).forEach(([name, value]) => xhr.setRequestHeader(name, value));

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress || !event.lengthComputable) return;
      options.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100);
        resolve();
      } else {
        const code = xhr.responseText?.match(/<Code>([^<]+)<\/Code>/)?.[1];
        const message = xhr.responseText?.match(/<Message>([^<]+)<\/Message>/)?.[1];
        reject(
          new Error(
            `R2 upload failed (${xhr.status}${code ? ` ${code}` : ''})` +
              (message ? `: ${message}` : ''),
          ),
        );
      }
    };
    xhr.onerror = () =>
      reject(
        new Error(
          'R2 upload failed: network error. Check that the bucket CORS rules allow ' +
            'PUT from this origin.',
        ),
      );
    xhr.ontimeout = () => reject(new Error('R2 upload timed out'));
    xhr.send(file);
  });

  return r2PublicUrl(key);
}

/** DELETE an object. A missing object is treated as success. */
export async function r2Delete(key: string): Promise<void> {
  assertConfigured();

  const emptyHash = await sha256Hex(new Uint8Array(0));
  const { url, headers } = await sign('DELETE', key, emptyHash);

  const response = await fetch(url, { method: 'DELETE', headers });
  if (response.ok || response.status === 404) return;
  throw new Error(`R2 delete failed: ${await describeFailure(response)}`);
}

/** HEAD an object; true when it exists. */
export async function r2Exists(key: string): Promise<boolean> {
  assertConfigured();
  const emptyHash = await sha256Hex(new Uint8Array(0));
  const { url, headers } = await sign('HEAD', key, emptyHash);
  const response = await fetch(url, { method: 'HEAD', headers });
  return response.ok;
}

function guessContentType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}
