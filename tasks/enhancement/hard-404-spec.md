# Proper 404 Responses for Missing Routes

## Summary
- Serve a real HTTP 404 when a non-existent path is requested, eliminating soft-404 warnings in Google Search Console and Analytics.
- Preserve SPA behaviour for valid client-side routes; keep Vue router handling internal navigation.

## Goals
- Keep existing authenticated/admin routes functional when deep-linked.
- Serve a `404.html` page with status `404` for unknown routes.
- Present consistent "Page Not Found" UX that matches `NotFoundView.vue`.
- Ensure analytics/events continue working when users hit a 404.
- Provide clear testing steps for local emulators and production hosting.

## Non-Goals
- Reworking copy or styling of the not-found experience.
- Adjusting Vue router logic beyond matching the existing catch-all component.
- Changing deployment provider or build pipeline.

## Requirements
- `public/_redirects` (and `dist/_redirects`) must enumerate SPA rewrites only for known routes (wildcards allowed), not a blanket `/* /index.html 200`.
- Unknown routes must return `404` with the `public/404.html` asset.
- `public/404.html` should render the Vue NotFound experience and lazily hydrate the SPA bundle so analytics hooks can run after load, without overriding the 404 status.
- Netlify preview and production environments must pick up the new behaviour automatically.
- Local `npm run dev` should continue to render `NotFoundView` for unknown routes (Vite dev server already returns 404).

## Implementation Outline
- Audit current route map (already in `src/router/index.js`) to confirm required rewrites; group routes to minimise `_redirects` entries (e.g. `/account/*`, `/admin/*`, `/recipes/*`).
- Update `public/_redirects`:
	- Keep specific rewrites (e.g. `/`, `/signin`, `/reset-password`, `/admin/*`) pointing to `/index.html 200`.
	- Add final catch-all rule `/* /404.html 404`.
- Create `public/404.html` leveraging `dist/index.html` shell:
	- Inline minimal markup mirroring `NotFoundView`.
	- Include `<script type="module">import '/src/main.js'</script>` wrapped in a conditional or deferred load so hydration happens after initial render.
	- Ensure the page references built assets (during build the Vite asset manifest should handle this via `%s` placeholders or by using a lightweight script that injects the SPA bundle).
- Confirm Vite copies both `_redirects` and `404.html` into `dist/`.
- Validate Analytics initialisation in 404 context (check `src/utils/analytics.js`). If telemetry must trigger only after SPA boot, ensure the script import preserves behaviour.

## Testing
- **Local**: `npm run dev`, hit a nonsense path, verify dev server responds 404 (Network panel).
- **Build**: `npm run build`, inspect `dist/_redirects` and `dist/404.html` for correct rules/content.
- **Netlify Preview**: Deploy preview, request bogus path, confirm response headers show `404` and content matches not-found view.
- **Google Search Console**: After deployment, re-run soft-404 validation to confirm issue cleared.

## Rollout / Monitoring
- Monitor Netlify logs for 404 volume to ensure no valid paths are inadvertently excluded.
- Add a manual QA checklist entry to `tasks/testing` once verified (optional follow-up).
- Communicate change in `data/updates.json` if users should know about improved error handling.

