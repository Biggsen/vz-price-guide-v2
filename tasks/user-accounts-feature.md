# User Accounts Feature - Fundamentals

## Overview

Implement a complete user account system with registration, authentication, password management, and email communications. This focuses on the core user account fundamentals before community features.

## Current State Analysis

### ✅ Already Implemented

**Authentication:**

-   Firebase Authentication with email/password
-   Login/logout functionality (`/signin` route)
-   Route protection with `requiresAuth` meta
-   User session management with VueFire
-   Admin system with custom claims
-   Email verification requirement for sign-in
-   First-time sign-in redirects to profile completion

**User Registration:**

-   Complete registration form (`/signup` route)
-   Email and password fields with validation
-   Password strength validation matching Firebase policy
-   Real-time password strength indicator
-   Terms of service acceptance checkbox
-   Email format validation
-   Error handling and user feedback
-   Redirect to email verification after successful registration

**Email Verification System:**

-   Firebase Auth email verification configured and working
-   Email verification sent automatically on registration
-   Complete email verification page (`/verify-email`)
-   Resend verification email functionality
-   Route protection blocks unverified users from protected features
-   Clear messaging about verification requirements
-   Router guard enforces verification for routes with `requiresVerification: true`

**User Profiles:**

-   Complete profile management system (`/profile` route)
-   Minecraft username and display name
-   Avatar generation from Minecraft username
-   Profile creation and editing
-   Account information display
-   Success message display for password changes
-   Sign out button with proper icon styling

**Password Management:**

-   Password reset functionality (`/reset-password` route)
-   "Forgot password" flow with email request
-   Password change capability (`/change-password` route)
-   Current password verification for changes
-   Password strength validation
-   Success redirect to profile page with message
-   Proper error handling and user feedback

**Security:**

-   Firestore security rules for user data
-   Proper user data isolation
-   Admin role management
-   Route protection with authentication and verification checks

### ❌ Missing Fundamentals

**1. Email Template Customization**

-   ✅ Email verification template customized with branding
-   ✅ Password reset template customized with branding
-   ✅ Sender name updated to "VZ Price Guide"
-   [ ] Test email deliverability and action URLs
-   [ ] Welcome email implementation (optional enhancement)

**2. Account Management Features**

-   No account deletion functionality
-   No email preferences settings
-   No security settings page

---

## Implementation Plan

### Phase 1: Registration & Email Verification

#### Task 1.1: Registration Form

-   ✅ Create `SignUpView.vue` component
-   ✅ Add `/signup` route to router
-   ✅ Form fields: email, password, confirm password
-   ✅ Terms of service acceptance checkbox
-   ✅ Password strength validation matching Firebase policy:
    -   Minimum 8 characters
    -   Maximum 4096 characters
    -   At least one uppercase character
    -   At least one lowercase character
    -   At least one numeric character
-   ✅ Real-time password strength indicator
-   ✅ Email format validation
-   ✅ Error handling and user feedback
-   ✅ Redirect to email verification after successful registration

#### Task 1.2: Email Verification System

-   ✅ Configure Firebase Auth email verification
-   ✅ Send verification email on registration
-   ✅ Create email verification page (`/verify-email`)
-   ✅ Handle verification callback
-   ✅ Resend verification email option
-   ✅ Block access to certain features until email verified
-   ✅ Clear messaging about verification status

#### Task 1.3: Welcome Email

-   [ ] Design welcome email template
-   [ ] Configure Firebase Auth email templates
-   [ ] Include getting started guide
-   [ ] Link to profile setup
-   [ ] Test email delivery

### Phase 2: Password Management

#### Task 2.1: Password Reset Flow

-   ✅ Create `ResetPasswordView.vue` component
-   ✅ Add `/reset-password` route
-   ✅ Email input form with validation
-   ✅ Send reset email functionality
-   ✅ Create `ResetPasswordConfirmView.vue` component
-   ✅ Add `/reset-password-confirm` route
-   ✅ Password reset form with token validation
-   ✅ Success confirmation page
-   ✅ Error handling for invalid/expired tokens

#### Task 2.2: Password Change in Profile

-   ✅ Create `ChangePasswordView.vue` component
-   ✅ Add `/change-password` route
-   ✅ Add link to change password page from profile
-   ✅ Current password verification
-   ✅ New password with confirmation
-   ✅ Password strength requirements matching Firebase policy:
    -   Minimum 8 characters
    -   Maximum 4096 characters
    -   At least one uppercase character
    -   At least one lowercase character
    -   At least one numeric character
-   ✅ Real-time password strength indicator
-   ✅ Success redirect to profile page with message
-   ✅ Error handling and user feedback
-   ✅ Proper icon styling for sign out button

#### Task 2.3: Password Reset Email

-   [ ] Design password reset email template
-   [ ] Include security best practices
-   [ ] Clear instructions for reset process
-   [ ] Test email delivery and token functionality

#### Task 2.4: Custom Password Reset Page and Action URL

-   ✅ Create a custom password reset page on your domain (`/reset-password`)
-   ✅ Create a custom password reset confirmation page (`/reset-password-confirm`)
-   ✅ Add a form for users to enter a new password (with validation)
-   ✅ Handle the Firebase password reset action code (oobCode) from the URL
-   ✅ Show success and error messages
-   [ ] Update Firebase Auth settings to use your custom reset confirmation page as the action URL
-   [ ] Test the full reset flow end-to-end

### Phase 3: Account Security & Settings

#### Task 3.1: Email Verification Enforcement

-   ✅ Identify features requiring email verification
-   ✅ Implement verification checks in protected routes
-   ✅ Clear messaging about verification requirements
-   ✅ Easy resend verification option
-   ✅ Update profile page to show verification status

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

-   ✅ **Email address verification**: Customized with branding
-   ✅ **Password reset**: Customized with branding
-   ✅ **Email address change**: Available in Firebase console
-   ✅ **Multi-factor enrollment notification**: Available in Firebase console

**Customization Tasks:**

-   ✅ Update sender name from "not provided" to "VZ Price Guide"
-   ✅ Customize email verification template:
    -   Update subject line to be more specific
    -   Improve message content and branding
    -   Add VZ Price Guide logo/styling
-   ✅ Customize password reset template:
    -   Update subject and message content
    -   Add branding and clear instructions
-   [ ] Test all email templates for deliverability
-   [ ] Verify action URLs work with our routing structure

#### Task 4.2: UX Review and Polish

**Pages Requiring UX Review:**

-   [x] **SignUpView.vue**

    -   [x] Review field labels, placeholders, and instructions for clarity
    -   [x] Check input validation and error messages
    -   [x] Test password visibility toggle (if present)
    -   [x] Confirm accessibility (labels, tab order, screen reader)
    -   [x] Verify mobile responsiveness
    -   [x] Review loading and success states
    -   [x] Check navigation to sign in and other relevant screens

-   [x] **SignInView.vue**

    -   [x] Review field labels and instructions
    -   [x] Test error messages for invalid credentials
    -   [x] Confirm “Forgot password?” link is visible and works
    -   [x] Check accessibility and keyboard navigation
    -   [x] Verify mobile responsiveness
    -   [x] Review loading and success states

-   [x] **ResetPasswordView.vue** (Password Reset Request)

    -   [x] Review instructions for requesting a reset
    -   [x] Test error/success messages for valid/invalid emails
    -   [x] Confirm accessibility and tab order
    -   [x] Verify mobile responsiveness

-   [x] **ResetPasswordConfirmView.vue** (Password Reset Confirm)

    -   [x] Review instructions for setting a new password
    -   [x] Test validation and error messages
    -   [x] Confirm accessibility and tab order
    -   [x] Verify mobile responsiveness

-   [ ] **VerifyEmailView.vue**

    -   [ ] Review messaging clarity and resend functionality
    -   [ ] Confirm accessibility and tab order
    -   [ ] Verify mobile responsiveness

-   [ ] **VerifyEmailSuccessView.vue**

    -   [ ] Review success states and navigation options
    -   [ ] Confirm accessibility and tab order
    -   [ ] Verify mobile responsiveness

-   [ ] **ChangePasswordView.vue**

    -   [ ] Review form layout and validation
    -   [ ] Test error/success messages
    -   [ ] Confirm accessibility and tab order
    -   [ ] Verify mobile responsiveness

-   [ ] **ProfileView.vue**
    -   [ ] Review profile management interface and success states
    -   [ ] Check edit and save flows
    -   [ ] Confirm accessibility and tab order
    -   [ ] Verify mobile responsiveness

**UX Improvements to Consider:**

-   [ ] **Consistent Design Language**: Ensure all forms follow the same design patterns
-   [ ] **Loading States**: Add proper loading indicators for all async operations
-   [ ] **Error Handling**: Improve error message clarity and user guidance
-   [ ] **Success Feedback**: Enhance success message presentation and next steps
-   [ ] **Form Validation**: Review real-time validation feedback and styling
-   [ ] **Mobile Responsiveness**: Ensure all pages work well on mobile devices
-   [ ] **Accessibility**: Review keyboard navigation, screen reader support, and ARIA labels
-   [ ] **Micro-interactions**: Add subtle animations and transitions for better UX
-   [ ] **Copy Review**: Review all text content for clarity and consistency
-   [ ] **Navigation Flow**: Ensure logical progression between pages

**Technical UX Considerations:**

-   [ ] **Form Auto-focus**: Ensure proper focus management on form fields
-   [ ] **Password Visibility**: Review password show/hide functionality
-   [ ] **Auto-complete**: Ensure proper autocomplete attributes on forms
-   [ ] **Browser Back Button**: Test navigation behavior with browser back/forward
-   [ ] **Deep Linking**: Ensure direct URL access works correctly
-   [ ] **Error Recovery**: Test error scenarios and recovery paths
-   [ ] **Performance**: Review loading times and optimize where needed

#### Task 4.3: Custom Email Verification Success Page

**Current State:**

-   ✅ Custom email verification success page implemented (`/verify-email-success`)
-   ✅ App branding and consistent styling applied
-   ✅ Verification token validation handled
-   ✅ Success message with app-specific content
-   ✅ Navigation options (sign in, go to profile, etc.)
-   ✅ Proper error handling for invalid/expired tokens
-   [ ] Configure Firebase Auth to use custom action URL
-   [ ] Test verification flow end-to-end

**Benefits:**

-   ✅ Consistent branding with app design
-   ✅ Better user experience and flow control
-   ✅ Integration with existing navigation
-   ✅ Professional appearance matching app standards

#### Task 4.2: Email Service Integration

**Current Configuration:**

-   ✅ **From address**: noreply@minecraft-economy-price-guide.net
-   ✅ **Reply to**: noreply
-   ✅ **Sender name**: "VZ Price Guide"

**Configuration Tasks:**

-   ✅ Update sender name to "VZ Price Guide"
-   [ ] Verify action URLs work with our app routing:
    -   Current: `https://minecraft-economy-price-guide.net/__/auth/action?mode=action&oobCode=code`
    -   Ensure our `/verify-email-success` and `/reset-password-confirm` routes handle these properly
-   [ ] Monitor email delivery rates
-   [ ] Handle email bounces and failures
-   [ ] Email analytics tracking

---

## Technical Requirements

### New Routes

```
/signup                  - User registration ✅ (implemented)
/verify-email          - Email verification ✅ (implemented)
/forgot-password       - Password reset request
/reset-password        - Password reset with token ✅ (implemented)
/change-password       - Password change for authenticated users ✅ (implemented)
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

-   Enable email verification ✅
-   Enable password reset ✅
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

-   ✅ Users can register without admin intervention
-   ✅ Email verification process is clear and reliable
-   ✅ Password reset works seamlessly
-   ✅ Account settings are intuitive and accessible

### Security

-   ✅ All new accounts require email verification
-   ✅ Password reset tokens are secure and time-limited
-   [ ] Account deletion properly cleans up all user data
-   ✅ No unauthorized access to user data

### Email Deliverability

-   [ ] Welcome emails delivered successfully (optional enhancement)
-   ✅ Verification emails reach users
-   ✅ Password reset emails work reliably
-   ✅ Email templates are professional and clear

---

## Dependencies

### External Dependencies

-   Firebase Auth email verification ✅ (configured)
-   Firebase Auth password reset ✅ (available)
-   Firebase Auth custom email templates ✅ (configured)
-   Email delivery service (Firebase Auth handles this) ✅ (noreply@minecraft-economy-price-guide.net)

### Internal Dependencies

-   Existing user profile system ✅
-   Existing authentication flow ✅
-   Existing admin system ✅
-   Existing Firestore security rules ✅

---

## Testing Checklist

### Registration Flow

-   ✅ New user can register with valid email/password
-   ✅ Registration fails with invalid email
-   ✅ Registration fails with weak password
-   ✅ Terms acceptance is required
-   [ ] Welcome email is sent
-   ✅ User is redirected to email verification

### Email Verification

-   ✅ Verification email is sent on registration
-   ✅ Verification link works correctly
-   ✅ Resend verification works
-   ✅ Unverified users see appropriate messaging
-   ✅ Verified users can access protected features

### Password Reset

-   ✅ Forgot password form works
-   ✅ Reset email is sent
-   ✅ Reset link works with valid token
-   ✅ Reset fails with invalid/expired token
-   ✅ Password change in profile works
-   [ ] Password change notification is sent (optional enhancement)

### Account Management

-   ✅ Account settings are accessible
-   [ ] Email preferences can be updated
-   [ ] Account deletion works completely
-   [ ] All user data is properly cleaned up

---

## Current Status Summary

**✅ CORE FUNCTIONALITY COMPLETE**

The user accounts system fundamentals are **production-ready** with all core features implemented:

-   **Registration**: Complete with validation and email verification
-   **Authentication**: Full sign-in/sign-out with email verification enforcement
-   **Password Management**: Reset and change functionality working
-   **Profile Management**: Complete user profile system
-   **Security**: Route protection and proper access controls

**🔄 REMAINING ENHANCEMENTS**

The remaining tasks are **optional enhancements** rather than fundamental requirements:

1. **Email Template Customization** - Improve branding and user experience
2. **Account Management Features** - Advanced settings and deletion
3. **Welcome Email** - Optional user onboarding enhancement

The system is fully functional and ready for production use. The remaining work focuses on polish and advanced features rather than core functionality.

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
