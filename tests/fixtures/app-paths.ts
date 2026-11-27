// Vitest stand-in for SvelteKit's $app/paths: no base path and no separate assets host.
export const asset = (file: string) => `/${file}`;
export const resolve = (path: string) => (path.startsWith('/') ? path : `/${path}`);
