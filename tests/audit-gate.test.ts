import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { advisories, evaluate } from '../tooling/audit-gate.mjs';

const via = (id: string, severity: string, name = '@sveltejs/kit') => ({ source: 1, name, title: `${id} title`, url: `https://github.com/advisories/${id}`, severity, range: '<=3.1.0' });
const report = {
  vulnerabilities: {
    '@sveltejs/kit': { name: '@sveltejs/kit', severity: 'high', via: [via('GHSA-low', 'low'), via('GHSA-high', 'high'), via('GHSA-moderate', 'moderate')] },
    // A package that is only reported because it depends on the one above.
    '@sveltejs/adapter-node': { name: '@sveltejs/adapter-node', severity: 'low', via: ['@sveltejs/kit'] },
    other: { name: 'other', severity: 'critical', via: [via('GHSA-critical', 'critical', 'other'), via('GHSA-high', 'high')] },
  },
};
const exception = (id: string, expires = '2027-01-31', pkg = '@sveltejs/kit') => ({ id, package: pkg, reason: 'Feature not used.', expires });
const ids = (items: { id: string }[]) => items.map(item => item.id);

describe('dependency audit gate', () => {
  it('lists each advisory once, skipping packages that only pass one on', () => {
    expect(ids(advisories(report))).toEqual(['GHSA-low', 'GHSA-high', 'GHSA-moderate', 'GHSA-critical']);
    expect(advisories({})).toEqual([]);
  });

  it('fails on every high or critical advisory without an exception', () => {
    const { failures, excepted } = evaluate(report, [], '2026-11-26');
    expect(ids(failures)).toEqual(['GHSA-high', 'GHSA-critical']);
    expect(excepted).toEqual([]);
  });

  it('lets an excepted advisory through until its end date, and only for its package', () => {
    const exceptions = [exception('GHSA-high'), exception('GHSA-critical', '2027-01-31', 'other')];
    expect(evaluate(report, exceptions, '2027-01-31').failures).toEqual([]);
    expect(evaluate(report, exceptions, '2027-01-31').excepted).toHaveLength(2);
    const late = evaluate(report, exceptions, '2027-02-01');
    expect(late.failures.map((item: { why: string }) => item.why)).toEqual(['the exception ended on 2027-01-31', 'the exception ended on 2027-01-31']);
    const wrongPackage = evaluate(report, [exception('GHSA-high'), exception('GHSA-critical')], '2026-11-26');
    expect(ids(wrongPackage.failures)).toEqual(['GHSA-critical']);
  });

  it('rejects an exception with no reason or end date, and reports ones no longer needed', () => {
    const incomplete = evaluate(report, [{ id: 'GHSA-high', package: '@sveltejs/kit', reason: '', expires: '2027-01-31' }, { id: 'GHSA-critical', package: 'other', reason: 'x' }], '2026-11-26');
    expect(incomplete.failures).toHaveLength(2);
    // Low and moderate advisories never block, so an exception for one is unused.
    expect(ids(evaluate(report, [exception('GHSA-low'), exception('GHSA-gone')], '2026-11-26').unused)).toEqual(['GHSA-low', 'GHSA-gone']);
  });
});

describe('audit exceptions on file', () => {
  const exceptions = JSON.parse(readFileSync('tooling/audit-exceptions.json', 'utf8')) as { id: string; package: string; reason: string; expires: string }[];

  it('each has a reason and an end date no later than May 2027', () => {
    for (const item of exceptions) {
      expect(item.id).toMatch(/^GHSA-/);
      expect(item.reason.length).toBeGreaterThan(40);
      expect(item.expires).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(item.expires <= '2027-05-31', `${item.id} expires ${item.expires}`).toBe(true);
    }
  });
});
