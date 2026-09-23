# Newsletter campaigns — Feature Specification

## Status: Implemented

Admin-authored marketing emails to users who opted in and have a verified email. Each campaign document stores the email content and live stats. Transactional suggestion mail is unchanged.

## Recipients

Send only when all of these are true:

- `users.marketing_opt_in.enabled === true`
- `users.email_verified === true`
- `users.email` is a usable address

Missing `marketing_opt_in` is treated as opted out.

## Admin UI

Lives under **Admin → Community**, not the Price Guide dashboard.

- `/admin/newsletter` — campaign list (drafts and sent). Sent rows show unique opens, clicks, unsubscribes.
- `/admin/newsletter/new` and `/admin/newsletter/:id` — compose a draft, or a read-only sent campaign with preview and stats.

Compose uses a markdown toolbar (bold, italic, links) stored as `bodyMarkdown`. Preview is escaped HTML with only `p`, `br`, `strong`, `em`, `a`.

Actions: save draft, send a test to the signed-in admin (not counted in campaign stats), send to all eligible subscribers after confirm. Sent campaigns are read-only.

Open counts are labelled as approximate in the UI.

## Data

`newsletters/{id}` (admin client read; drafts create/update/delete; send and stats via Admin SDK):

- `subject`, `bodyMarkdown`
- `status`: `draft` | `sending` | `sent` | `failed`
- `createdBy`, `createdAt`, `updatedAt`, `sentAt`
- `recipientCount`, `sentCount`, `failedCount`
- `stats`: `delivered`, `uniqueOpened`, `uniqueClicked`, `bounced`, `complained`, `unsubscribed`, `clicksByUrl`

`email_logs/newsletter:{newsletterId}:{uid}` stores Resend `email_id` for send idempotency.

`newsletter_events/{eventId}` records unique tracking/unsubscribe events (client access denied).

`marketing_opt_in.method` may be `'signup' | 'settings' | 'unsubscribe'`.

Composite index: `users.marketing_opt_in.enabled` + `users.email_verified`.

## Sending

Cloud Functions in [`functions/newsletter.js`](../../functions/newsletter.js), exported from [`functions/index.js`](../../functions/index.js).

- `sendNewsletterTest` — admin callable; subject prefixed `[Test]`; no campaign tags.
- `sendNewsletter` — admin callable; Resend batches of 100; timeout 540s; tags `newsletter_id` and `uid`; List-Unsubscribe headers.

From address and Resend key match suggestion mail (`RESEND_API_KEY`).

Shared helpers live in [`functions/emailShared.js`](../../functions/emailShared.js).

## Unsubscribe

- Public page `/unsubscribe?token=` (no auth). Calls `unsubscribeMarketing`.
- HTTP function `unsubscribeMarketing` (`GET` JSON for the page, `POST` 200 for Gmail one-click).
- HMAC token (`uid` + newsletter id) signed with `RESEND_API_KEY`.
- Sets `marketing_opt_in.enabled: false`, `method: 'unsubscribe'`, increments campaign `stats.unsubscribed` once.

Account Email Preferences already bind to the same field.

## Tracking

`resendWebhook` verifies Svix signatures with `RESEND_WEBHOOK_SECRET` and handles `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`. Untagged mail (suggestion emails) is ignored.

Unique opens/clicks increment once per recipient per campaign. Clicks also increment `stats.clicksByUrl[url]`.

Enable open and click tracking on the Resend domain, and point the webhook at the `resendWebhook` function URL.

## Secrets (deploy)

```
firebase functions:secrets:set RESEND_WEBHOOK_SECRET
```

`RESEND_API_KEY` already used for suggestion emails and for signing unsubscribe links.

## Test attributes

- `data-cy="community-newsletter-card"`
- `data-cy="newsletter-list"` / `newsletter-new` / `newsletter-compose`
- `data-cy="newsletter-subject"` / `newsletter-body` / `newsletter-preview`
- `data-cy="newsletter-send"` / `newsletter-send-confirm` / `newsletter-stats`
- `data-cy="unsubscribe-page"` / `unsubscribe-success` / `unsubscribe-already` / `unsubscribe-invalid`
