# Email Notifications for Suggestions - Feature Specification

## Overview

Implement email notifications to keep users informed about admin responses to their suggestions. This will improve user engagement and provide better communication between users and admins.

## Scope

### **Notification Triggers**

-   Admin comments on user suggestions
-   Admin status changes to suggestions
-   Optional: Admin replies to user comments

### **User Experience**

-   Users receive timely email notifications
-   Clear, actionable email content
-   Unsubscribe options
-   Notification preferences

---

## Functional Requirements

### **1. Email Triggers**

#### **Admin Comment Notifications**

-   **Trigger**: When an admin adds a comment to any suggestion
-   **Recipients**: Original suggestion author
-   **Content**: Suggestion title, admin comment, link to view
-   **Timing**: Immediate (within 5 minutes)

#### **Status Change Notifications**

-   **Trigger**: When admin changes suggestion status
-   **Recipients**: Original suggestion author
-   **Content**: Suggestion title, old status → new status, admin comment (if any)
-   **Timing**: Immediate (within 5 minutes)

#### **Comment Reply Notifications**

-   **Trigger**: When admin replies to user comment
-   **Recipients**: Comment author
-   **Content**: Suggestion title, admin reply, link to view
-   **Timing**: Immediate (within 5 minutes)

### **2. Email Content**

#### **Email Template Structure**

```
Subject: [Admin Response] Your Suggestion: "{suggestion_title}"

Hi {user_display_name},

{admin_name} has responded to your suggestion:

Title: {suggestion_title}
Status: {current_status}
Comment: {admin_comment}

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

-   **Email notifications**: On/Off toggle
-   **Comment notifications**: On/Off toggle
-   **Status change notifications**: On/Off toggle
-   **Comment reply notifications**: On/Off toggle

#### **User Profile Updates**

-   Add `email_notifications` object to user profiles
-   Default: All notifications enabled
-   Respect user preferences before sending

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
// Add to existing user profile
email_notifications: {
  enabled: boolean,           // Master toggle
  comments: boolean,         // Admin comments
  status_changes: boolean,   // Status updates
  comment_replies: boolean   // Admin replies to comments
}
```

#### **Email Log Collection**

```javascript
// New collection: email_logs
{
  userId: string,
  suggestionId: string,
  type: 'admin_comment' | 'status_change' | 'comment_reply',
  sentAt: timestamp,
  status: 'sent' | 'delivered' | 'bounced' | 'failed',
  emailService: 'sendgrid' | 'mailgun',
  templateId: string
}
```

### **3. Firebase Functions**

#### **Comment Notification Function**

```javascript
exports.sendAdminCommentEmail = functions.firestore
	.document('suggestions/{suggestionId}/comments/{commentId}')
	.onCreate(async (snap, context) => {
		// Check if comment is from admin
		// Get suggestion details
		// Get user email preferences
		// Send email if enabled
	})
```

#### **Status Change Function**

```javascript
exports.sendStatusChangeEmail = functions.firestore
	.document('suggestions/{suggestionId}')
	.onUpdate(async (change, context) => {
		// Check if status changed
		// Get user email preferences
		// Send email if enabled
	})
```

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
-   `{admin_comment}`
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

-   Clear opt-in during registration
-   Easy unsubscribe in every email
-   Granular notification controls

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
