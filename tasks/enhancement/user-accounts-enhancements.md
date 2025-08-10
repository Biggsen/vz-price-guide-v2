# User Accounts Enhancements (Post-Fundamentals)

## Overview

This spec captures the remaining enhancements for the user accounts system after the fundamentals were completed. It focuses on account settings, account deletion and data lifecycle, email communications (templates and action URLs), and deliverability/analytics.

## Scope

-   Add account settings (email preferences, security/session management) and data export
-   Implement full account deletion with complete data cleanup
-   Finalize email communication flows (welcome email, reset email content), action URL configuration, and deliverability monitoring
-   Supporting telemetry for email reliability (bounces, analytics)

---

## Work Items

### 1) Account Settings and Data Lifecycle

-   [ ] Add Account Settings section to `AccountView.vue`
    -   [ ] Email preferences (notifications, marketing)
    -   [ ] Security settings page (session management, recent sign-in info)
    -   [ ] Data export (download user-owned data as JSON)
-   [ ] Persist settings to Firestore
    -   [ ] Extend `users` document schema with `email_preferences`, `last_password_change`, `terms_accepted` fields
    -   [ ] Migrate any existing users to include defaults

### 2) Account Deletion (GDPR-style Cleanup)

-   [ ] Add account deletion flow with explicit confirmation and data warning
-   [ ] Backend cleanup on delete:
    -   [ ] Delete user profile document(s) in `users`
    -   [ ] Delete user-owned shops and servers collections/docs
    -   [ ] Remove the user from Firebase Auth
-   [ ] Success confirmation view and post-delete UX (sign-out + redirect)
-   [ ] Update Firestore security rules to allow self-delete where required

### 3) Email Communications, Templates, and Action URLs

-   [ ] Welcome email
    -   [ ] Design and author template (branding, getting started, link to profile)
    -   [ ] Configure sending on successful registration
    -   [ ] Test deliverability
-   [ ] Password reset email improvements
    -   [ ] Confirm template content includes security guidance and clear steps
    -   [ ] Test token handling and edge cases end-to-end
-   [ ] Action URL configuration
    -   [ ] Configure Firebase to use custom action URLs for verification and reset confirm
    -   [ ] Verify routes: `/verify-email-success` and `/reset-password-confirm`
-   [ ] Deliverability and reliability
    -   [ ] Monitor delivery rates
    -   [ ] Handle bounces and failures (operational playbook, provider dashboards)
    -   [ ] Optional: basic analytics tracking (UTM params or template identifiers)

### 4) Technical Requirements

-   [ ] Database schema extensions for `users` documents:

```javascript
// users collection (extensions)
{
  email_preferences: {
    notifications: boolean,
    marketing: boolean
  },
  terms_accepted: boolean,
  terms_accepted_date: timestamp,
  registration_method: string, // 'email' initially
  last_password_change: timestamp
}
```

-   [ ] Security rules: verify writes respect ownership and verified-email enforcement
-   [ ] Settings UI hidden/disabled for unverified users where necessary

### 5) Testing Checklist

-   Account settings
    -   [ ] Update and persist email preferences
    -   [ ] Security/session management flows are visible and accurate
    -   [ ] Data export produces a correct, complete JSON file
-   Account deletion
    -   [ ] Deletion confirms and blocks on dangerous action
    -   [ ] All user-owned data is purged (profile, shops, servers)
    -   [ ] Firebase Auth user removed
    -   [ ] Post-delete UX: signed out and redirected with confirmation
-   Emails and action URLs
    -   [ ] Welcome email sent and delivered
    -   [ ] Password reset email template renders properly
    -   [ ] Custom action URLs route correctly and complete flows

### 6) Success Metrics

-   [ ] ≥95% email deliverability for verification and reset emails
-   [ ] ≥90% successful completion rate for reset and verification flows (no dead ends)
-   [ ] 0 orphaned records after account deletion

### 7) Dependencies

-   Firebase Authentication (email/password)
-   Firestore (users, shops, servers collections)
-   Existing `AccountView.vue` foundation and security rules

### Out of Scope

-   Social login providers (Google, GitHub, Microsoft)
-   Two-factor authentication
-   Advanced audit logging
