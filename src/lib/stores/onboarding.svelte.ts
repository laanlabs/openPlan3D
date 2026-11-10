// Onboarding tooltips — track which tips have been shown
const STORAGE_KEY = 'o3d_tips_seen';

export type TipId = 'first-wall' | 'first-furniture' | 'first-3d' | 'first-export' | 'first-door';

export const TIP_MESSAGES: Record<TipId, string> = {
  'first-wall': 'Nice! Connect walls to create rooms. Press Escape when done.',
  'first-furniture': 'Drag to move, R to rotate, or use handles to resize.',
  'first-3d': 'Orbit with mouse, scroll to zoom, double-click to orbit around a point. Try walkthrough mode!',
  'first-export': 'Your plan is ready! Try SVG for vector graphics or PDF for printing.',
  'first-door': 'Click on a wall to place doors and windows.',
};

// Seen this session, even if storage could not record it.
const seenThisSession = new Set<TipId>();

function getSeenTips(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persist(seen: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen])); } catch { /* Dismissal still lasts for this session. */ }
}

/** Returns true if the tip hasn't been shown yet */
export function showTip(tipId: TipId): boolean {
  return !seenThisSession.has(tipId) && !getSeenTips().has(tipId);
}

/** Mark a tip as seen so it won't show again */
export function markTipSeen(tipId: TipId): void {
  seenThisSession.add(tipId);
  const seen = getSeenTips();
  seen.add(tipId);
  persist(seen);
}

// Svelte 5 reactive state for the currently active tip
let _activeTip = $state<{ id: TipId; x: number; y: number } | null>(null);

export function getActiveTip() { return _activeTip; }

/** Trigger a tip at a screen position. No-ops if already seen. */
export function triggerTip(tipId: TipId, x: number, y: number) {
  if (!showTip(tipId)) return;
  _activeTip = { id: tipId, x, y };
}

/** Dismiss the current tip */
export function dismissTip() {
  if (_activeTip) {
    const { id } = _activeTip;
    // Close first: recording the tip must never keep it on screen.
    _activeTip = null;
    markTipSeen(id);
  }
}
