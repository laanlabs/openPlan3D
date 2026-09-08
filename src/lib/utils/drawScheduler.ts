/** Coalesce invalidations into one frame, including invalidation during drawing. */
export function createDrawScheduler(
  draw: () => void,
  request: typeof requestAnimationFrame = requestAnimationFrame,
  cancel: typeof cancelAnimationFrame = cancelAnimationFrame,
) {
  let stopped = false;
  let frame: number | undefined;
  const tick = () => {
    frame = undefined;
    if (!stopped) draw();
  };
  return {
    invalidate() {
      if (!stopped && frame === undefined) frame = request(tick);
    },
    stop() {
      stopped = true;
      if (frame !== undefined) cancel(frame);
      frame = undefined;
    },
  };
}
