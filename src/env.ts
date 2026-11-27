import { defineEnvVars } from '@sveltejs/kit/env';

// SvelteKit gives the app only the variables declared here; an undeclared one reads as undefined.
// Declare no secret here for now: `vite dev` writes every declared value, private ones too, into a file
// the dev server will serve (.svelte-kit/generated/dev/env/config.js). Production builds do not.

/** Every variable is optional: unset means the feature is off (self-hosted instances, tests). */
const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
	HANDOFF_UPLOADS_ENABLED: { schema: optional },
	HANDOFF_BUCKET: { schema: optional },
	HANDOFF_CORS_ALLOW_LOCAL: { schema: optional },
	ASSISTANT_SHARES_ENABLED: { schema: optional },
	PUBLIC_ENABLE_ANALYTICS: { public: true, schema: optional }
});
