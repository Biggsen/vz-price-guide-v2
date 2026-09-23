# Newsletter campaigns — Feature Specification

## Status: Implemented

Admin-authored marketing emails to users who opted in and have a verified email. Each campaign document stores the email content and live stats. Transactional suggestion mail is unchanged.

## Recipients

Send only when all of these are true:

- `users.marketing_opt_in.enabled === true`
- `users.email_verified === true`
- `users.email` is a usable address (string containing `@`)

Missing `marketing_opt_in` is treated as opted out.

The admin header and send confirm use `countNewsletterRecipients`, which runs the same filter as send (not a Firestore count of opt-in + verified only).

## Admin UI

Lives under **Admin → Community**, not the Price Guide dashboard.

- `/admin/newsletter` — campaign list (drafts, sending, failed, sent). Sent and failed rows show unique opens, clicks, unsubscribes.
- `/admin/newsletter/new` and `/admin/newsletter/:id` — compose a draft, or a campaign with preview and stats.

Compose uses a markdown toolbar (heading, bold, italic, links) stored as `bodyMarkdown`. Preview is escaped HTML with `h1`–`h3`, `p`, `br`, `strong`, `em`, `a`. Headings are lines starting with `#`, `##`, or `###`.

Actions: save draft, send a test to the signed-in admin (not counted in campaign stats), send to all eligible subscribers after confirm. **Sent** campaigns are fully read-only. **Sending** and **failed** lock subject/body (content must not change mid-retry) and show **Resume send** for remaining recipients. Empty eligible list stays `draft` and does not send.

Open counts are labelled as approximate in the UI.

## Data

`newsletters/{id}` (admin client read; drafts create/update/delete; send and stats via Admin SDK):

- `subject`, `bodyMarkdown`
- `status`: `draft` | `sending` | `sent` | `failed`
- `createdBy`, `createdAt`, `updatedAt`, `sentAt`
- `recipientCount`, `sentCount`, `failedCount` (`failedCount` is this send/resume run only; a clean resume writes `0`)
- `stats`: `delivered`, `uniqueOpened`, `uniqueClicked`, `bounced`, `complained`, `unsubscribed`, `clicksByUrl`

Status after a send run:

- `sent` only when that run had `failedCount === 0` (every claimed remaining recipient was marked sent).
- `failed` when any Resend batch in that run failed (partial or total).
- No eligible subscribers: leave status unchanged (`draft`) and throw `failed-precondition`.

`email_logs/newsletter:{newsletterId}:{uid}` stores Resend `email_id` for send idempotency. Logs with `status: sent` are skipped on resume. Failed batches delete their pending logs so a retry can re-claim them. Leftover `pending` logs from a crash are retried.

`newsletter_events/{eventId}` records unique tracking/unsubscribe events (client access denied).

`marketing_opt_in.method` may be `'signup' | 'settings' | 'unsubscribe'`.

Composite index: `users.marketing_opt_in.enabled` + `users.email_verified`.

## Sending

Cloud Functions in [`functions/newsletter.js`](../../functions/newsletter.js), exported from [`functions/index.js`](../../functions/index.js).

- `countNewsletterRecipients` — admin callable; `{ count }` matching `loadEligibleRecipients()`.
- `sendNewsletterTest` — admin callable; subject prefixed `[Test]`; no campaign tags.
- `sendNewsletter` — admin callable; Resend batches of 100; timeout 540s; tags `newsletter_id` and `uid`; List-Unsubscribe headers.

From: `vz price guide <updates@minecraft-economy-price-guide.net>`. Suggestion mail still uses `support@`. Same `RESEND_API_KEY`.

Shared helpers live in [`functions/emailShared.js`](../../functions/emailShared.js).

Bounces and complaints are **after** Resend accepts the message. They increment campaign stats via webhook; they do not mark the campaign `failed` or allow a retry of those addresses (the log is already `sent`).

## Unsubscribe

- Public page `/unsubscribe?token=` (no auth): success, already unsubscribed, or invalid token. Site chrome (nav, footer, cookie banner) is hidden. Preview without a token: `/unsubscribe?preview=1` (success), `?preview=already`, `?preview=invalid`.
- HTTP function `unsubscribeMarketing` (`GET` JSON for the page, `POST` 200 for Gmail one-click).
- HMAC token (`uid` + newsletter id) signed with `NEWSLETTER_UNSUBSCRIBE_SECRET` (not the Resend API key).
- Sets `marketing_opt_in.enabled: false`, `method: 'unsubscribe'`, increments campaign `stats.unsubscribed` once.

Account Email Preferences already bind to the same field.

## Tracking

`resendWebhook` verifies Svix signatures with `RESEND_WEBHOOK_SECRET` and handles `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`. Untagged mail (suggestion emails) is ignored.

Unique opens/clicks increment once per recipient per campaign. Clicks also increment `stats.clicksByUrl[url]`. Clicks on the in-app unsubscribe page or `unsubscribeMarketing` are ignored (they do not increment unique clicks or `clicksByUrl`).

Enable open and click tracking on the Resend domain, and point the webhook at the `resendWebhook` function URL.

## Secrets and deploy

Required for production (functions + Firestore):

```
firebase deploy --only firestore:rules,firestore:indexes --project prod
firebase functions:secrets:set RESEND_WEBHOOK_SECRET --project prod
firebase functions:secrets:set NEWSLETTER_UNSUBSCRIBE_SECRET --project prod
```

Use the signing secret from the Resend webhook dashboard for `RESEND_WEBHOOK_SECRET` (not a placeholder). Set `NEWSLETTER_UNSUBSCRIBE_SECRET` once to a long random value; rotating it invalidates outstanding unsubscribe links. Then redeploy functions.

`RESEND_API_KEY` is already used for suggestion emails and Resend sends only.

Confirm `updates@minecraft-economy-price-guide.net` is allowed on the Resend domain.

Emulator: put `NEWSLETTER_UNSUBSCRIBE_SECRET` (and `RESEND_API_KEY`) in `functions/.secret.local`. If the unsubscribe secret is missing locally, signing falls back to `emulator-unsubscribe-secret`.

## Test attributes

- `data-cy="community-newsletter-card"`
- `data-cy="newsletter-list"` / `newsletter-new` / `newsletter-compose`
- `data-cy="newsletter-subject"` / `newsletter-body` / `newsletter-preview`
- `data-cy="newsletter-send"` / `newsletter-send-confirm` / `newsletter-stats`
- `data-cy="unsubscribe-page"` / `unsubscribe-success` / `unsubscribe-already` / `unsubscribe-invalid`
