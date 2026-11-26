#!/usr/bin/env node
// CI's dependency gate: fail on any high or critical npm advisory that isn't listed, with a reason
// and an end date, in tooling/audit-exceptions.json. An exception is for an advisory that cannot
// affect this app (a feature it doesn't use) while its fix needs a major upgrade; it is not a way
// to postpone one that does.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BLOCKING = new Set(['high', 'critical']);

/**
 * @typedef {{ id: string, package: string, severity: string, title: string, url: string }} Advisory
 * @typedef {{ id: string, package: string, reason?: string, expires?: string }} Exception
 * @typedef {{ vulnerabilities?: Record<string, { via?: (string | { name: string, severity: string, title: string, url?: string })[] }> }} Report
 */

/**
 * The distinct advisories in `npm audit --json` output.
 * @param {Report | null | undefined} report
 * @returns {Advisory[]}
 */
export function advisories(report) {
  /** @type {Map<string, Advisory>} */
  const found = new Map();
  for (const entry of Object.values(report?.vulnerabilities ?? {})) {
    for (const via of entry.via ?? []) {
      if (typeof via !== 'object' || !via.url) continue; // a string names the package it comes through
      const id = via.url.split('/').pop() ?? via.url;
      found.set(id, { id, package: via.name, severity: via.severity, title: via.title, url: via.url });
    }
  }
  return [...found.values()];
}

/**
 * Sort the report's blocking advisories against the exceptions.
 * - `failures`: blocking advisories with no exception, or one that ended or names another package.
 * - `excepted`: blocking advisories let through, with their exception.
 * - `unused`: exceptions the report no longer needs, to be removed.
 * @param {Report | null | undefined} report
 * @param {Exception[]} exceptions
 * @param {string} [today] YYYY-MM-DD
 */
export function evaluate(report, exceptions, today = new Date().toISOString().slice(0, 10)) {
  const blocking = advisories(report).filter(advisory => BLOCKING.has(advisory.severity));
  /** @type {(Advisory & { why: string })[]} */
  const failures = [];
  /** @type {(Advisory & { exception: Exception })[]} */
  const excepted = [];
  for (const advisory of blocking) {
    const exception = exceptions.find(item => item.id === advisory.id);
    if (!exception) failures.push({ ...advisory, why: 'no exception' });
    else if (exception.package !== advisory.package) failures.push({ ...advisory, why: `the exception is for ${exception.package}` });
    else if (!exception.expires || !/^\d{4}-\d{2}-\d{2}$/.test(exception.expires) || !exception.reason) failures.push({ ...advisory, why: 'the exception needs a reason and an expires date (YYYY-MM-DD)' });
    else if (exception.expires < today) failures.push({ ...advisory, why: `the exception ended on ${exception.expires}` });
    else excepted.push({ ...advisory, exception });
  }
  const unused = exceptions.filter(item => !blocking.some(advisory => advisory.id === item.id));
  return { failures, excepted, unused };
}

function auditReport() {
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch (error) {
    // npm exits non-zero when it finds anything; its report is still on stdout.
    const stdout = /** @type {{ stdout?: string }} */ (error).stdout;
    if (stdout) return JSON.parse(stdout);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const exceptions = JSON.parse(readFileSync(new URL('./audit-exceptions.json', import.meta.url), 'utf8'));
  const report = auditReport();
  // No report means the audit itself didn't run (registry error); that must not pass as "nothing found".
  if (report.error || !report.vulnerabilities) {
    console.error(`npm audit failed: ${report.error?.summary ?? report.error?.code ?? 'no report'}`);
    process.exit(1);
  }
  const { failures, excepted, unused } = evaluate(report, exceptions);
  for (const item of excepted) console.log(`Excepted until ${item.exception.expires}: ${item.id} (${item.package}, ${item.severity}) ${item.title}\n  ${item.exception.reason}`);
  for (const item of unused) console.log(`Unused exception, remove it from tooling/audit-exceptions.json: ${item.id}`);
  for (const item of failures) console.error(`Blocking: ${item.id} (${item.package}, ${item.severity}) ${item.title}\n  ${item.url}\n  ${item.why}`);
  if (failures.length) process.exit(1);
  console.log(`No blocking advisories (${excepted.length} excepted).`);
}
