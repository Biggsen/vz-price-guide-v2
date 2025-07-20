# User Accounts Feature - Fundamentals

## Overview

Implement a complete user account system with registration, authentication, password management, and email communications. This focuses on the core user account fundamentals before community features.

## Current State Analysis

### ✅ Already Implemented

**Authentication:**

-   Firebase Authentication with email/password
-   Login/logout functionality (`/login` route)
-   Route protection with `requiresAuth` meta
-   User session management with VueFire
-   Admin system with custom claims

**User Profiles:**

-   Complete profile management system (`/profile` route)
-   Minecraft username and display name
-   Avatar generation from Minecraft username
-   Profile creation and editing
-   Account information display

**Security:**

-   Firestore security rules for user data
-   Proper user data isolation
-   Admin role management

### ❌ Missing Fundamentals

**1. User Registration System**

-   No registration form/flow
-   Users can only be created via Firebase Console
-   No email verification process
-   No terms of service acceptance during registration

**2. Password Management**

-   No password reset functionality
-   No "forgot password" flow
-   No password change capability
-   No email verification for password changes

**3. Email Communications**

-   No welcome emails for new users
-   No email verification emails
-   No password reset emails
-   No account security notifications

**4. Account Security**

-   No email verification requirement
-   No account deletion functionality
-   No account recovery options
-   No security settings page

---

## Implementation Plan

### Phase 1: Registration & Email Verification

#### Task 1.1: Registration Form

-   [ ] Create `RegisterView.vue` component
-   [ ] Add `/register` route to router
-   [ ] Form fields: email, password, confirm password
-   [ ] Terms of service acceptance checkbox
-   [ ] Password strength validation matching Firebase policy:
    -   Minimum 8 characters
    -   Maximum 4096 characters
    -   At least one uppercase character
    -   At least one lowercase character
    -   At least one numeric character
-   [ ] Real-time password strength indicator
-   [ ] Email format validation
-   [ ] Error handling and user feedback
-   [ ] Redirect to email verification after successful registration

#### Task 1.2: Email Verification System

-   [ ] Configure Firebase Auth email verification
-   [ ] Send verification email on registration
-   [ ] Create email verification page (`/verify-email`)
-   [ ] Handle verification callback
-   [ ] Resend verification email option
-   [ ] Block access to certain features until email verified
-   [ ] Clear messaging about verification status

#### Task 1.3: Welcome Email

-   [ ] Design welcome email template
-   [ ] Configure Firebase Auth email templates
-   [ ] Include getting started guide
-   [ ] Link to profile setup
-   [ ] Test email delivery

### Phase 2: Password Management

#### Task 2.1: Password Reset Flow

-   [ ] Create `ForgotPasswordView.vue` component
-   [ ] Add `/forgot-password` route
-   [ ] Email input form with validation
-   [ ] Send reset email functionality
-   [ ] Create `ResetPasswordView.vue` component
-   [ ] Add `/reset-password` route with token parameter
-   [ ] Password reset form with token validation
-   [ ] Success confirmation page
-   [ ] Error handling for invalid/expired tokens

#### Task 2.2: Password Change in Profile

-   [ ] Add password change section to ProfileView
-   [ ] Current password verification
-   [ ] New password with confirmation
-   [ ] Password strength requirements matching Firebase policy:
    -   Minimum 8 characters
    -   Maximum 4096 characters
    -   At least one uppercase character
    -   At least one lowercase character
    -   At least one numeric character
-   [ ] Real-time password strength indicator
-   [ ] Email notification of password change
-   [ ] Success/error feedback

#### Task 2.3: Password Reset Email

-   [ ] Design password reset email template
-   [ ] Include security best practices
-   [ ] Clear instructions for reset process
-   [ ] Test email delivery and token functionality

### Phase 3: Account Security & Settings

#### Task 3.1: Email Verification Enforcement

-   [ ] Identify features requiring email verification
-   [ ] Implement verification checks in protected routes
-   [ ] Clear messaging about verification requirements
-   [ ] Easy resend verification option
-   [ ] Update profile page to show verification status

#### Task 3.2: Account Settings

-   [ ] Add account settings section to ProfileView
-   [ ] Email preferences (notifications, marketing)
-   [ ] Account deletion option with confirmation
-   [ ] Security settings (session management)
-   [ ] Data export functionality

#### Task 3.3: Account Deletion

-   [ ] Implement account deletion functionality
-   [ ] Delete user profile data from Firestore
-   [ ] Delete user shops and servers
-   [ ] Delete user from Firebase Auth
-   [ ] Confirmation dialog with data warning
-   [ ] Success confirmation page

### Phase 4: Email Templates & Communications

#### Task 4.1: Email Template System

**Current Firebase Templates:**

-   ✅ **Email address verification**: Configured with default template
-   ✅ **Password reset**: Available in Firebase console
-   ✅ **Email address change**: Available in Firebase console
-   ✅ **Multi-factor enrollment notification**: Available in Firebase console

**Customization Tasks:**

-   [ ] Update sender name from "not provided" to "VZ Price Guide"
-   [ ] Customize email verification template:
    -   Update subject line to be more specific
    -   Improve message content and branding
    -   Add VZ Price Guide logo/styling
-   [ ] Customize password reset template:
    -   Update subject and message content
    -   Add branding and clear instructions
-   [ ] Test all email templates for deliverability
-   [ ] Verify action URLs work with our routing structure

#### Task 4.3: Custom Email Verification Success Page (Optional)

**Current State:**

-   Firebase provides default email verification success page
-   Generic styling without app branding
-   Users see "Your email has been verified" message

**Customization Tasks:**

-   [ ] Create custom email verification success page (`/verify-email-success`)
-   [ ] Add route to router with proper meta tags
-   [ ] Design page with app branding and consistent styling
-   [ ] Handle verification token validation
-   [ ] Show success message with app-specific content
-   [ ] Add navigation options (sign in, go to profile, etc.)
-   [ ] Configure Firebase Auth to use custom action URL
-   [ ] Test verification flow end-to-end
-   [ ] Ensure proper error handling for invalid/expired tokens

**Benefits:**

-   Consistent branding with app design
-   Better user experience and flow control
-   Integration with existing navigation
-   Professional appearance matching app standards

#### Task 4.2: Email Service Integration

**Current Configuration:**

-   ✅ **From address**: noreply@minecraft-economy-price-guide.net
-   ✅ **Reply to**: noreply
-   ❌ **Sender name**: "not provided" (needs updating)

**Configuration Tasks:**

-   [ ] Update sender name to "VZ Price Guide"
-   [ ] Verify action URLs work with our app routing:
    -   Current: `https://minecraft-economy-price-guide.net/__/auth/action?mode=action&oobCode=code`
    -   Ensure our `/verify-email` and `/reset-password` routes handle these properly
-   [ ] Monitor email delivery rates
-   [ ] Handle email bounces and failures
-   [ ] Email analytics tracking

---

## Technical Requirements

### New Routes

```
/register              - User registration
/verify-email          - Email verification
/forgot-password       - Password reset request
/reset-password        - Password reset with token
```

### Database Schema Updates

```javascript
// users collection - add fields:
{
  email_verified: boolean,
  terms_accepted: boolean,
  terms_accepted_date: timestamp,
  email_preferences: {
    notifications: boolean,
    marketing: boolean
  },
  registration_method: string, // 'email' (for now, expandable to 'google', 'github', etc.)
  last_password_change: timestamp
}
```

### Firebase Auth Configuration

-   Enable email verification
-   Enable password reset
-   Configure custom email templates
-   Set up email action URLs
-   Configure account deletion

#### Sign-in Providers

**Current Configuration:**

-   **Email/Password**: ✅ Enabled (primary authentication method)

**Future Enhancements:**

-   Google OAuth
-   GitHub OAuth
-   Microsoft OAuth
-   Other social providers

#### Password Policy Configuration

**Enforcement Mode:**

-   **Require enforcement**: Sign-up attempts fail until users comply with password policy

**Password Requirements:**

-   **Minimum length**: 8 characters
-   **Maximum length**: 4096 characters
-   **Require uppercase character**: ✅ Enabled
-   **Require lowercase character**: ✅ Enabled
-   **Require numeric character**: ✅ Enabled
-   **Require special character**: ❌ Disabled
-   **Force upgrade on sign-in**: ❌ Disabled

### Security Rules Updates

```javascript
// Add to firestore.rules:
match /users/{userId} {
  allow read: if request.auth != null && (
    request.auth.uid == userId ||
    request.auth.token.admin == true
  );
  allow write: if request.auth != null && request.auth.uid == userId;
  allow delete: if request.auth != null && request.auth.uid == userId;
}
```

---

## Success Metrics

### User Experience

-   [ ] Users can register without admin intervention
-   [ ] Email verification process is clear and reliable
-   [ ] Password reset works seamlessly
-   [ ] Account settings are intuitive and accessible

### Security

-   [ ] All new accounts require email verification
-   [ ] Password reset tokens are secure and time-limited
-   [ ] Account deletion properly cleans up all user data
-   [ ] No unauthorized access to user data

### Email Deliverability

-   [ ] Welcome emails delivered successfully
-   [ ] Verification emails reach users
-   [ ] Password reset emails work reliably
-   [ ] Email templates are professional and clear

---

## Dependencies

### External Dependencies

-   Firebase Auth email verification ✅ (configured)
-   Firebase Auth password reset ✅ (available)
-   Firebase Auth custom email templates ✅ (configured)
-   Email delivery service (Firebase Auth handles this) ✅ (noreply@minecraft-economy-price-guide.net)

### Internal Dependencies

-   Existing user profile system
-   Existing authentication flow
-   Existing admin system
-   Existing Firestore security rules

---

## Testing Checklist

### Registration Flow

-   [ ] New user can register with valid email/password
-   [ ] Registration fails with invalid email
-   [ ] Registration fails with weak password
-   [ ] Terms acceptance is required
-   [ ] Welcome email is sent
-   [ ] User is redirected to email verification

### Email Verification

-   [ ] Verification email is sent on registration
-   [ ] Verification link works correctly
-   [ ] Resend verification works
-   [ ] Unverified users see appropriate messaging
-   [ ] Verified users can access protected features

### Password Reset

-   [ ] Forgot password form works
-   [ ] Reset email is sent
-   [ ] Reset link works with valid token
-   [ ] Reset fails with invalid/expired token
-   [ ] Password change in profile works
-   [ ] Password change notification is sent

### Account Management

-   [ ] Account settings are accessible
-   [ ] Email preferences can be updated
-   [ ] Account deletion works completely
-   [ ] All user data is properly cleaned up

---

## Future Enhancements (Post-Fundamentals)

### Optional Features

-   Social login (Google, GitHub)
-   Two-factor authentication
-   Account recovery options
-   Advanced security settings
-   User activity logging
-   Account suspension/banning

### Community Features (Separate Document)

-   User feedback system
-   Feature request tracking
-   Community forums
-   User reputation system
-   Public profile sharing
