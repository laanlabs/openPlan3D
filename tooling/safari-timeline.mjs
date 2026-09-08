import { readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const round = value => Math.round(value * 10000) / 10000;
function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { count: 0, min: null, mean: null, p95: null, max: null };
  return {
    count: sorted.length, min: round(sorted[0]),
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    p95: round(sorted[Math.ceil(sorted.length * 0.95) - 1]), max: round(sorted.at(-1)),
  };
}

/** Aggregate only numeric measurements. Never copy requests, cookies, headers,
 * screenshots, script sources, stack traces or project contents into a report. */
export function summarizeSafariTimeline(data, { from = 0, to } = {}) {
  const recording = data?.recording;
  if (data?.version !== 1 || !Array.isArray(recording?.records)
    || !Number.isFinite(recording.startTime) || !Number.isFinite(recording.endTime)
    || recording.endTime <= recording.startTime) throw new Error('Unsupported Safari timeline recording');
  const duration = recording.endTime - recording.startTime;
  to ??= duration;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from || to > duration) {
    throw new Error('Choose a time range within the recording, in seconds');
  }
  const rows = recording.records.filter(row => {
    const time = row.startTime ?? row.timestamp;
    return Number.isFinite(time) && time >= recording.startTime + from && time < recording.startTime + to;
  });
  const frames = rows.filter(row => row.type === 'timeline-record-type-rendering-frame'
    && Number.isFinite(row.endTime) && row.endTime >= row.startTime).sort((a, b) => a.startTime - b.startTime);
  const frameIntervals = frames.slice(1).map((frame, index) => (frame.startTime - frames[index].startTime) * 1000);
  const memoryKinds = new Set(['javascript', 'jit', 'images', 'layers', 'page', 'other']);
  const memoryBytes = rows.filter(row => row.type === 'timeline-record-type-memory' && Array.isArray(row.categories))
    .map(row => row.categories.filter(category => memoryKinds.has(category.type)
      && Number.isFinite(category.size) && category.size >= 0).reduce((sum, category) => sum + category.size, 0));
  return {
    recordingSeconds: round(duration), rangeSeconds: { from: round(from), to: round(to) },
    renderingFrames: frames.length,
    animationCallbacks: rows.filter(row => row.type === 'timeline-record-type-script' && row.eventType === 'animation-frame-fired').length,
    animationRequests: rows.filter(row => row.type === 'timeline-record-type-script' && row.eventType === 'animation-frame-requested').length,
    // Inspector's elapsed frame span, not isolated CPU work or GPU timer queries.
    frameDurationMs: stats(frames.map(frame => (frame.endTime - frame.startTime) * 1000)),
    frameStartIntervalMs: stats(frameIntervals),
    cpuPercent: stats(rows.filter(row => row.type === 'timeline-record-type-cpu' && row.usage >= 0).map(row => row.usage)),
    memoryMB: stats(memoryBytes.map(bytes => bytes / 1_000_000)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [file, ...args] = process.argv.slice(2);
    if (!file || args.length % 2) throw new Error('Usage: node tooling/safari-timeline.mjs recording.json [--from seconds] [--to seconds]');
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      if (!['--from', '--to'].includes(args[index])) throw new Error('Unknown option');
      options[args[index].slice(2)] = Number(args[index + 1]);
    }
    if ((await stat(file)).size > 128 * 1024 * 1024) throw new Error('Record a shorter trace (maximum 128 MiB)');
    console.log(JSON.stringify(summarizeSafariTimeline(JSON.parse(await readFile(file, 'utf8')), options), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
