# Suggestion Emails — Feature Specification

## Status: Implemented

Transactional emails for the Suggestions feature, sent via Resend from Cloud Functions. Marketing campaigns, status-change mail, and user-facing unsubscribe are out of scope.

## What ships

1. **Admin reply:** when a verified admin posts in `suggestions/{id}/suggestionMessages/{messageId}`, email the suggestion author.

   Subject: `New reply to your suggestion: "{title}"`

   Copy:

   You’ve got a reply

   {admin name} replied to your suggestion “{title}”:

   “{message}”

   View conversation →
2. **New suggestion:** when a user creates a suggestion, email `support@minecraft-economy-price-guide.net`.
3. **User reply:** when a non-admin posts on an existing thread, email `support@`.

Admin-authored suggestions and admin messages do not notify `support@`. An admin replying on their own suggestion does not email themselves.

There is no Account toggle. Authors always get reply mail.

## Implementation

- Provider: Resend. Secret `RESEND_API_KEY` (Firebase Functions secrets). From: `vz price guide <support@minecraft-economy-price-guide.net>`.
- Triggers: [`functions/suggestionEmails.js`](../../functions/suggestionEmails.js) (`sendSuggestionMessageEmail`, `sendNewSuggestionEmail`), exported from [`functions/index.js`](../../functions/index.js).
- Admin check uses Auth custom claim `admin === true`, not `authorRole`.
- Idempotency: `email_logs/{eventKey}` created before send (`admin_message:{suggestionId}:{messageId}`, `user_message:{suggestionId}:{messageId}`, `new_suggestion:{suggestionId}`). Client access denied in [`firestore.rules`](../../firestore.rules).
- Deep links: `/suggestions?id=` (author) and `/admin/suggestions?id=` (admin). Cards scroll and briefly highlight.

## Setup (done 10 Sep 2026)

- Prod `RESEND_API_KEY` set (rotated after a leaked key).
- Domain `minecraft-economy-price-guide.net` verified in Resend. DNS on Netlify. DMARC skipped. Proton root MX unchanged.

## Future

- Status-change emails
- Marketing / news posts
- Email logs dashboard
- Bounce/open tracking
