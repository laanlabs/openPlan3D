// CORS for /api/handoffs. The OpenLandscape3D and OpenCatio3D web planners call it cross-origin from their
// "Open in OpenPlan3D" buttons with fetch + JSON (the OpenKitchen3D handoff lives in its iPhone app), which
// browsers preflight; without these headers the preflight fails and they silently fall back to a JSON download.
// Only the family's deployed origins are allowed, as exact hosts: Firebase site ids are global and first come,
// so a hostname pattern would trust ids nobody has reserved. The siblings read 413/422/429 and Retry-After from
// error responses, and the endpoint never uses cookies, so no credentials header is ever sent. Local development
// origins are admitted only when the route is told to (HANDOFF_CORS_ALLOW_LOCAL=true), never by default.
const ORIGINS = new Set([
  'https://app.openplan3d.com', 'https://openplan3d.com',
  'https://app.openlandscape3d.com', 'https://openlandscape3d.com',
  'https://app.openkitchen3d.com', 'https://openkitchen3d.com',
  'https://openkitchen3d-cloud.web.app', 'https://openkitchen3d-cloud.firebaseapp.com',
  'https://app.opencatio3d.com', 'https://opencatio3d.com',
]);
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function allowedHandoffOrigin(origin: string | null | undefined, allowLocal = false): boolean {
  return !!origin && (ORIGINS.has(origin) || (allowLocal && LOCAL.test(origin)));
}

export function handoffCorsHeaders(origin: string | null | undefined, allowLocal = false): Record<string, string> {
  if (!allowedHandoffOrigin(origin, allowLocal)) return {};
  return {
    'Access-Control-Allow-Origin': origin as string,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Expose-Headers': 'Retry-After',
    'Access-Control-Max-Age': '86400',
  };
}
