/**
 * Polyfills required by pdfjs-dist v5+ on older Android WebViews.
 * Import this module before any pdfjs import or worker initialization.
 */

/** Inline script injected ahead of pdf.worker.min.js in a Blob worker */
export function getPdfWorkerPolyfillScript(): string {
  return `
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () {
    var resolve, reject;
    var promise = new Promise(function (res, rej) {
      resolve = res;
      reject = rej;
    });
    return { promise: promise, resolve: resolve, reject: reject };
  };
}
if (typeof URL.parse !== 'function') {
  URL.parse = function (url, base) {
    try {
      return new URL(url, base);
    } catch (e) {
      return null;
    }
  };
}
if (typeof Promise.try !== 'function') {
  Promise.try = function (callback) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (resolve, reject) {
      try {
        resolve(callback.apply(null, args));
      } catch (e) {
        reject(e);
      }
    });
  };
}
if (!Number.prototype.hasOwnProperty('toHex')) {
  Object.defineProperty(Number.prototype, 'toHex', {
    value: function () {
      var num = Math.floor(this) >>> 0;
      return '0x' + num.toString(16).toUpperCase().padStart(2, '0');
    },
    enumerable: false,
    writable: true,
    configurable: true
  });
}
`;
}

export function applyPdfPolyfills(): void {
  if (typeof Promise.withResolvers === 'undefined') {
    (Promise as typeof Promise & {
      withResolvers: <T>() => {
        promise: Promise<T>;
        resolve: (value: T | PromiseLike<T>) => void;
        reject: (reason?: unknown) => void;
      };
    }).withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  if (typeof (Promise as Promise & { try?: unknown }).try === 'undefined') {
    (Promise as Promise & {
      try: (callback: (...args: unknown[]) => unknown, ...args: unknown[]) => Promise<unknown>;
    }).try = function (callback: (...args: unknown[]) => unknown, ...args: unknown[]) {
      return new Promise((resolve, reject) => {
        try {
          resolve(callback(...args));
        } catch (err) {
          reject(err);
        }
      });
    };
  }

  if (typeof URL.parse !== 'function') {
    (URL as typeof URL & { parse: (url: string | URL, base?: string | URL) => URL | null }).parse =
      function (url: string | URL, base?: string | URL): URL | null {
        try {
          return new URL(url, base);
        } catch {
          return null;
        }
      };
  }

  if (!Number.prototype.hasOwnProperty('toHex')) {
    Object.defineProperty(Number.prototype, 'toHex', {
      value: function (this: number) {
        const num = Math.floor(this) >>> 0;
        return '0x' + num.toString(16).toUpperCase().padStart(2, '0');
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
}

/** Resolve pdf.worker.min.js for web (/) and Capacitor APK (./) builds */
export function getPdfWorkerAssetUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}pdf.worker.min.js`;
}
