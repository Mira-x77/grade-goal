#!/usr/bin/env node
/**
 * Makes the generated Capacitor iOS project portable and buildable with the
 * Capacitor 8 toolchain.
 *
 * Run it after `npx cap sync ios` (the `ios:sync` npm script does this for you).
 *
 * Why it exists — `cap sync` regenerates two files in a platform-specific way:
 *
 *  1. `ios/App/CapApp-SPM/Package.swift` lists the plugins as *local* Swift
 *     packages with relative paths. On Windows the CLI writes
 *     `..\..\..\node_modules\@capacitor\app`, but Swift Package Manager on macOS
 *     treats a backslash as a literal character, so package resolution fails
 *     with "package not found". This script rewrites them to POSIX separators.
 *
 *  2. Capacitor 8 requires an iOS 15 deployment target (the iOS package, the
 *     SwiftPM binary target and every official plugin declare `iOS 15.0`).
 *     A lower value produces "compiled for iOS 13 but linked framework requires
 *     iOS 15" warnings and can crash at launch. This script raises the values.
 *
 * The script is idempotent and safe to run on macOS/Linux too.
 */

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const iosRoot = join(repoRoot, 'ios');
const spmPackage = join(iosRoot, 'App', 'CapApp-SPM', 'Package.swift');
const pbxproj = join(iosRoot, 'App', 'App.xcodeproj', 'project.pbxproj');
const infoPlist = join(iosRoot, 'App', 'App', 'Info.plist');

const MIN_IOS_VERSION = 15;
const changes = [];
const problems = [];

function fail(message) {
  problems.push(message);
  console.error(`✖ ${message}`);
}

function note(message) {
  changes.push(message);
  console.log(`✔ ${message}`);
}

/* -------------------------------------------------------------------------- */
/* 1. Swift Package manifest: POSIX paths + iOS 15                             */
/* -------------------------------------------------------------------------- */

if (!existsSync(spmPackage)) {
  fail(`Missing ${spmPackage}. Run "npx cap sync ios" first.`);
} else {
  const before = readFileSync(spmPackage, 'utf8');
  let after = before;

  // Rewrite only the local package paths, leaving the rest untouched.
  after = after.replace(/(\bpath:\s*")([^"]*)(")/g, (_match, start, value, end) => {
    const posix = value.replace(/\\/g, '/');
    return start + posix + end;
  });

  // Capacitor 8 needs iOS 15.
  after = after.replace(/(platforms:\s*\[\s*\.iOS\(\.v)(\d+)(\)\s*\])/g, (_match, start, version, end) => {
    const current = Number(version);
    return start + String(Math.max(current, MIN_IOS_VERSION)) + end;
  });

  if (after !== before) writeFileSync(spmPackage, after, 'utf8');

  const paths = [...after.matchAll(/\bpath:\s*"([^"]*)"/g)].map((m) => m[1]);
  const windowsPaths = paths.filter((p) => p.includes('\\'));
  if (windowsPaths.length > 0) fail(`Package.swift still has Windows separators: ${windowsPaths[0]}`);

  const missing = paths.filter((p) => !existsSync(join(dirname(spmPackage), p)));
  if (missing.length > 0) fail(`Package.swift points at missing local packages: ${missing.join(', ')}`);

  const platform = after.match(/platforms:\s*\[\s*\.iOS\(\.v(\d+)\)\s*\]/);
  if (!platform) fail('Package.swift has no explicit iOS platform declaration');
  else if (Number(platform[1]) < MIN_IOS_VERSION) {
    fail(`Package.swift targets iOS ${platform[1]}, Capacitor 8 needs iOS ${MIN_IOS_VERSION}`);
  }

  if (after !== before) note(`Package.swift: ${paths.length} plugin paths normalised to POSIX, iOS ${platform?.[1]}`);
  else note(`Package.swift already portable (${paths.length} plugin paths, iOS ${platform?.[1]})`);
}

/* -------------------------------------------------------------------------- */
/* 2. Xcode project: deployment target                                         */
/* -------------------------------------------------------------------------- */

if (!existsSync(pbxproj)) {
  fail(`Missing ${pbxproj}`);
} else {
  const before = readFileSync(pbxproj, 'utf8');
  let raised = 0;

  const after = before.replace(/(IPHONEOS_DEPLOYMENT_TARGET\s*=\s*)([\d.]+)(\s*;)/g, (_m, start, version, end) => {
    const value = Number(version);
    if (Number.isFinite(value) && value < MIN_IOS_VERSION) {
      raised += 1;
      return `${start}${MIN_IOS_VERSION}.0${end}`;
    }
    return _m;
  });

  if (after !== before) writeFileSync(pbxproj, after, 'utf8');

  const remaining = [...after.matchAll(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*([\d.]+)/g)].map((m) => Number(m[1]));
  if (remaining.length === 0) fail('No IPHONEOS_DEPLOYMENT_TARGET found in project.pbxproj');
  if (remaining.some((v) => v < MIN_IOS_VERSION)) fail(`Deployment target still below iOS ${MIN_IOS_VERSION}`);

  if (raised > 0) note(`project.pbxproj: raised ${raised} deployment target(s) to iOS ${MIN_IOS_VERSION}.0`);
  else note(`project.pbxproj: deployment target iOS ${Math.min(...remaining)} (${remaining.length} configs)`);

  // Identity keys must be present so the IPA reports the same version as Android.
  for (const [label, pattern] of [
    ['PRODUCT_BUNDLE_IDENTIFIER', /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g],
    ['MARKETING_VERSION', /MARKETING_VERSION\s*=\s*([^;]+);/g],
    ['CURRENT_PROJECT_VERSION', /CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/g],
  ]) {
    const values = new Set([...after.matchAll(pattern)].map((m) => m[1].trim()));
    if (values.size === 0) fail(`${label} is missing from project.pbxproj`);
    else note(`project.pbxproj: ${label} = ${[...values].join(', ')}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 3. Info.plist sanity                                                        */
/* -------------------------------------------------------------------------- */

if (!existsSync(infoPlist)) {
  fail(`Missing ${infoPlist}`);
} else {
  const plist = readFileSync(infoPlist, 'utf8');
  const displayName = plist.match(/<key>CFBundleDisplayName<\/key>\s*<string>([^<]*)<\/string>/)?.[1]?.trim();
  const usesVersionVars =
    /CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/.test(plist) &&
    /CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/.test(plist);

  if (!displayName) fail('CFBundleDisplayName is empty in Info.plist');
  else note(`Info.plist: display name "${displayName}"`);

  if (!usesVersionVars) {
    fail(
      'Info.plist must use $(MARKETING_VERSION) and $(CURRENT_PROJECT_VERSION) ' +
        'so the IPA version tracks the Xcode build settings',
    );
  } else {
    note('Info.plist: version keys bound to build settings');
  }
}

/* -------------------------------------------------------------------------- */
/* 4. Do not bundle Android artifacts in the IPA                               */
/* -------------------------------------------------------------------------- */

const iosWebPublic = join(iosRoot, 'App', 'App', 'public');
if (existsSync(iosWebPublic)) {
  const apks = readdirSync(iosWebPublic).filter((name) => name.toLowerCase().endsWith('.apk'));
  for (const name of apks) {
    rmSync(join(iosWebPublic, name), { force: true });
    note(`ios public: removed ${name} (Android download is not an iOS asset)`);
  }
  if (apks.length === 0) note('ios public: no Android artifacts to remove');
}

/* -------------------------------------------------------------------------- */

if (problems.length > 0) {
  console.error(`\nprepare-ios: ${problems.length} problem(s) found.`);
  process.exit(1);
}

console.log(`\nprepare-ios: iOS project is ready (${changes.length} check(s), iOS ${MIN_IOS_VERSION}+).`);
