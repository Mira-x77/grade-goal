/**
 * Runtime polyfills for Android 8 WebView (Chrome ~61).
 * Loaded before the React app bundle.
 */

export function applyAndroid8Polyfills(): void {
  if (typeof globalThis === 'undefined') {
    (window as Window & { globalThis?: typeof globalThis }).globalThis = window;
  }

  if (!Object.fromEntries) {
    Object.fromEntries = function fromEntries<T = unknown>(
      entries: Iterable<readonly [PropertyKey, T]>,
    ): { [k: string]: T } {
      const out: { [k: string]: T } = {};
      for (const [key, value] of entries) {
        out[String(key)] = value;
      }
      return out;
    };
  }

  if (!Array.prototype.flat) {
    Array.prototype.flat = function flat(depth = 1): unknown[] {
      const d = Math.floor(depth) || 1;
      return (this as unknown[]).reduce<unknown[]>((acc, val) => {
        if (d > 0 && Array.isArray(val)) {
          acc.push(...(val as unknown[]).flat(d - 1));
        } else {
          acc.push(val);
        }
        return acc;
      }, []);
    };
  }

  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function replaceAll(
      search: string | RegExp,
      replacement: string,
    ): string {
      if (search instanceof RegExp) {
        if (!search.global) {
          throw new TypeError('replaceAll requires a global RegExp');
        }
        return this.replace(search, replacement);
      }
      return this.split(search).join(replacement);
    };
  }
}
