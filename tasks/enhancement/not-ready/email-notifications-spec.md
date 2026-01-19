# Email Notifications for Suggestions - Feature Specification

## Status: Not Ready

This spec is **not implementation-ready yet**. The core approach is defined, but the “Open Questions / Must-Decide Before Implementation” section must be resolved (deep-link target, rate limiting behavior, status change attribution) before building.

## Overview

Implement email notifications to keep users informed about admin responses to their suggestions. This will improve user engagement and provide better communication between users and admins.

## Current Implementation Reality (Important)

The shipped Suggestions feature already supports a private, one-to-one discussion thread between staff and the suggestion author. Those messages are stored in:

- `suggestions/{suggestionId}/suggestionMessages/{messageId}`
- Each message includes `userId`, `body`, and an `authorRole` field (`'admin'` or `'user'`).

This spec must align with that reality. If we implement triggers on a different subcollection (like `comments`), notifications will never fire.

## Scope

### **Notification Triggers**

-   Admin posts a message in a suggestion thread
-   Admin changes suggestion status
-   Optional (future): digest / batching / advanced notification schedules

### **User Experience**

-   Users receive timely email notifications
-   Clear, actionable email content
-   Unsubscribe options
-   Notification preferences

---

## Functional Requirements

### **1. Email Triggers**

#### **Admin Message Notifications (Current Thread Model)**

-   **Trigger**: When a new document is created under `suggestions/{suggestionId}/suggestionMessages/{messageId}` AND the author is a verified admin (see “Admin verification” below)
-   **Recipients**: The original suggestion author (the `suggestions/{suggestionId}.userId`)
-   **Content**: Suggestion title, admin display name, message body, link to view conversation
-   **Timing**: Immediate (best effort; target within 5 minutes)
-   **Notes**:
    - This is a linear thread today (no “reply-to messageId”), so “reply notifications” are treated as “new admin message notifications”.
    - Do not send when the message is authored by the suggestion owner (user reply) unless a future requirement adds “notify admins on user reply”.

#### **Status Change Notifications**

-   **Trigger**: When admin changes suggestion status
-   **Recipients**: Original suggestion author
-   **Content**: Suggestion title, old status → new status, link to view conversation
-   **Timing**: Immediate (within 5 minutes)

#### **(Removed) Comment Reply Notifications**

-   The current data model does not support true threaded replies (no “reply-to”), so this trigger is redundant with “Admin Message Notifications”.
-   If threaded replies are added later, re-introduce this as a distinct event type with explicit semantics.

### **2. Email Content**

#### **Email Template Structure**

```
Subject: [Admin Response] Your Suggestion: "{suggestion_title}"

Hi {user_display_name},

{admin_name} has responded to your suggestion:

Title: {suggestion_title}
Status: {current_status}
Message: {admin_message}

View full conversation: {link_to_suggestion}

---
Unsubscribe: {unsubscribe_link}
```

#### **Email Templates**

-   **Admin Comment**: Focus on the comment content
-   **Status Change**: Highlight the status transition
-   **Comment Reply**: Show the threaded conversation

### **3. User Preferences**

#### **Notification Settings**

-   **Suggestion notifications**: master On/Off toggle
-   **Admin message notifications**: On/Off toggle
-   **Status change notifications**: On/Off toggle

#### **User Profile Updates**

-   Store preferences on the user doc in Firestore (`users/{userId}`)
-   Default: enabled for suggestion notifications (transactional), but user can disable any time
-   Respect user preferences before sending
-   Marketing opt-in remains separate and is handled by `marketing_opt_in` (out of scope here)

---

## Technical Requirements

### **1. Email Service Setup**

#### **Service Provider**

-   **Primary**: SendGrid (recommended for Firebase)
-   **Alternative**: Mailgun or Nodemailer with SMTP
-   **Fallback**: Firebase Extensions for email

#### **Configuration**

-   Environment variables for API keys
-   Email templates stored in Firebase Storage
-   Rate limiting and delivery tracking

### **2. Database Schema**

#### **User Profile Updates**

```javascript
// Add to existing users/{userId} doc
email_preferences: {
  suggestions: {
    enabled: boolean,        // Master toggle for suggestion-related notifications
    admin_messages: boolean, // New admin message in thread
    status_changes: boolean  // Status updates
  }
}
```

#### **Email Log Collection**

```javascript
// New collection: email_logs
{
  userId: string,
  suggestionId: string,
  type: 'admin_message' | 'status_change',
  eventKey: string, // unique idempotency key for this email event
  sentAt: timestamp,
  status: 'sent' | 'delivered' | 'bounced' | 'failed',
  emailService: 'sendgrid' | 'mailgun',
  templateId: string
}
```

### **3. Firebase Functions**

#### **Admin Message Notification Function**

```javascript
exports.sendAdminCommentEmail = functions.firestore
	.document('suggestions/{suggestionId}/suggestionMessages/{messageId}')
	.onCreate(async (snap, context) => {
		// Verify author is actually an admin (do not trust authorRole alone)
		// Get suggestion details
		// Get user email preferences (email_preferences.suggestions.*)
		// Send email if enabled
		// Write email_logs with eventKey to prevent duplicates on retries
	})
```

#### **Status Change Function**

```javascript
exports.sendStatusChangeEmail = functions.firestore
	.document('suggestions/{suggestionId}')
	.onUpdate(async (change, context) => {
		// Check if status changed
		// Get user email preferences (email_preferences.suggestions.*)
		// Send email if enabled
		// Write email_logs with eventKey to prevent duplicates on retries
	})
```

### **3.1 Admin Verification (Critical)**

-   The function must confirm the message author is a real admin using a trusted source (e.g. Firebase Auth custom claims `admin: true`).
-   Do not rely solely on a Firestore field like `authorRole` because it can be spoofed unless rules guarantee it cannot.

### **3.2 Idempotency / Deduping (Critical)**

-   Firestore triggers can retry; without idempotency you will send duplicate emails.
-   Use a deterministic `eventKey` and store it in `email_logs` before/with sending. Example strategies:
    - Use the function event id (when available) + type
    - Or use `{type}:{suggestionId}:{messageId}` for message-created events
    - Or use `{type}:{suggestionId}:{beforeStatus}->{afterStatus}:{timestampBucket}` for status changes

### **4. Email Templates**

#### **Template Storage**

-   Store in Firebase Storage: `/email-templates/`
-   Use Handlebars or similar templating
-   Support for HTML and plain text versions

#### **Template Variables**

-   `{user_display_name}`
-   `{admin_name}`
-   `{suggestion_title}`
-   `{suggestion_body}`
-   `{admin_message}`
-   `{status_old}` and `{status_new}`
-   `{link_to_suggestion}`
-   `{unsubscribe_link}`

---

## Implementation Plan

### **Phase 1: Foundation**

1. **Email Service Setup**

    - Configure SendGrid account
    - Set up Firebase Functions
    - Create email templates

2. **Database Updates**
    - Add email notification fields to user profiles
    - Create email_logs collection
    - Update user registration to include email preferences

### **Phase 2: Core Notifications**

1. **Admin Comment Notifications**

    - Implement comment trigger function
    - Create admin comment email template
    - Test email delivery

2. **Status Change Notifications**
    - Implement status change trigger
    - Create status change email template
    - Test email delivery

### **Phase 3: User Controls**

1. **Notification Preferences**

    - Add settings UI to user profile
    - Implement preference updates
    - Add unsubscribe functionality

2. **Email Management**
    - Add email logs dashboard (admin)
    - Implement bounce handling
    - Add delivery status tracking

### **Phase 4: Advanced Features**

1. **Comment Reply Notifications**

    - Implement comment reply detection
    - Create reply email template
    - Test threaded conversations

2. **Email Analytics**
    - Track open rates
    - Monitor bounce rates
    - Generate notification reports

---

## Security & Privacy

### **Data Protection**

-   Encrypt email addresses in transit
-   Secure API key storage
-   GDPR compliance for EU users

### **Rate Limiting**

-   Max 5 emails per user per day
-   Respect unsubscribe requests immediately
-   Implement email cooldown periods

### **User Consent**

-   Suggestion notifications are transactional/product notifications (not marketing)
-   Provide granular controls in account settings to disable suggestion notifications
-   Include a one-click “disable suggestion notifications” link in emails (signed token recommended), plus an in-app settings page

---

## Open Questions / Must-Decide Before Implementation

-   **Email deep-link**: there is no `/suggestions/:id` detail route today. Decide what the email links to:
    - `/suggestions` (simple), optionally with a query param to highlight/scroll to the suggestion
    - or introduce a dedicated detail route first
-   **Rate limiting behavior**: “max 5 emails/user/day” can drop important replies. Decide:
    - hard cap (drop), or
    - digest/batching within a time window, or
    - cap only certain event types
-   **Status change author**: status updates don’t currently record “who changed status”. If you want “Admin: X changed status”, decide where to store that metadata.

---

## Success Metrics

### **Engagement Metrics**

-   Email open rates (target: >25%)
-   Click-through rates (target: >5%)
-   User retention after notifications

### **Technical Metrics**

-   Email delivery rate (target: >95%)
-   Function execution time (target: <5 seconds)
-   Error rates (target: <1%)

### **User Satisfaction**

-   Notification preference adoption
-   Unsubscribe rates (target: <2%)
-   User feedback on notification usefulness

---

## Future Enhancements

### **Advanced Notifications**

-   Digest emails (weekly summary)
-   Priority notifications for urgent suggestions
-   Custom notification schedules

### **Integration Features**

-   Slack/Discord notifications for admins
-   Mobile push notifications
-   SMS notifications for critical updates

### **Analytics & Reporting**

-   Email performance dashboard
-   User engagement analytics
-   A/B testing for email templates

---

## Dependencies

### **External Services**

-   SendGrid account and API key
-   Firebase Functions (Blaze plan)
-   Email template design

### **Internal Dependencies**

-   User profile system
-   Suggestion management system
-   Comment system
-   Admin authentication

### **Development Tools**

-   Email testing service (Mailtrap)
-   Template preview tools
-   Email deliverability testing

---

## Timeline Estimate

-   **Phase 1**: 1-2 weeks
-   **Phase 2**: 2-3 weeks
-   **Phase 3**: 1-2 weeks
-   **Phase 4**: 2-3 weeks

**Total**: 6-10 weeks for full implementation

---

## Risk Assessment

### **Technical Risks**

-   Email deliverability issues
-   Firebase Functions cold starts
-   Template rendering performance

### **Mitigation Strategies**

-   Use email service best practices
-   Implement retry logic for failed sends
-   Cache templates for performance
-   Monitor email reputation

### **User Experience Risks**

-   Email fatigue from too many notifications
-   Spam folder delivery issues
-   Unsubscribe complexity

### **Mitigation Strategies**

-   Granular notification controls
-   Clear, valuable email content
-   Simple one-click unsubscribe
-   Email authentication (SPF, DKIM, DMARC)
