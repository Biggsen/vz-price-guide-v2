# Marketing Email Opt-In Feature Specification

## Overview

Implement an explicit opt-in system for marketing emails to ensure compliance with email marketing best practices and regulations (GDPR, CAN-SPAM). Users must explicitly consent to receive marketing emails about new features and updates.

## Scope

- Add marketing email opt-in checkbox during user signup
- Add marketing email opt-in toggle in account settings
- Store opt-in status, timestamp, and method in user document (created during signup for all users)
- Only send marketing emails to users who have opted in

---

## Functional Requirements

### 1. Signup Flow

#### Marketing Opt-In Checkbox

- **Location**: Signup form (`SignUpView.vue`)
- **Placement**: After Terms of Service checkbox, before Submit button
- **Label**: "I'd like to receive emails about new features and updates"
- **Default State**: Unchecked (opt-in by default is false)
- **Required**: No (optional checkbox)
- **Data Attribute**: `data-cy="signup-marketing-opt-in"`

#### User Experience

- Checkbox is clearly optional
- Text explains what types of emails they'll receive
- Checkbox does not block account creation if unchecked
- Opt-in choice is saved when account is created

### 2. Account Settings

#### Email Preferences Section

- **Location**: Account page (`AccountView.vue`)
- **Section Title**: "Email Preferences"
- **Placement**: After Profile section, before Account Actions section
- **Visibility**: Visible to all authenticated users

#### Marketing Opt-In Toggle

- **Label**: "Receive emails about new features and updates"
- **Type**: Checkbox/toggle
- **Default State**: Reflects current opt-in status from user profile
- **Data Attribute**: `data-cy="account-marketing-opt-in"`
- **Save Behavior**: Updates immediately when toggled (auto-save)

#### User Experience

- Clear indication of current opt-in status
- Toggle updates Firestore immediately
- Success feedback when preference is saved
- Option to opt-out at any time

---

## Data Model

### Firestore Schema Extension

Add to `users` collection documents:

```javascript
{
  // ... existing user profile fields ...
  marketing_opt_in: {
    enabled: boolean,              // true if user opted in, false otherwise
    timestamp: string,             // ISO timestamp of when opt-in was set/changed
    method: 'signup' | 'settings' // How the user opted in/out
  }
}
```

### Default Values

- **New Users**: A minimal user document is created during signup with the `marketing_opt_in` field. The field is always created with `enabled: false` if the checkbox is unchecked, or `enabled: true` if checked. This ensures 100% of new signups have their preference recorded.
- **Existing Users**: Users created before this feature have no `marketing_opt_in` field, which should be treated as `enabled: false` (explicit opt-out)

### Data Migration

- Existing users without `marketing_opt_in` field are treated as opted-out (explicit opt-out)
- No migration script needed - field is created on-demand when existing users interact with preference in account settings
- New signups will automatically have the field created during signup

---

## Implementation Details

### 1. Signup Form Updates

**File**: `src/views/SignUpView.vue`

- Add `marketingOptIn` ref (boolean, default: false)
- Add checkbox in template after terms checkbox
- Update `signUpToFirebase()` to create a minimal user document with marketing opt-in status after account creation
- **Important**: A minimal user document is created for ALL signups (not just those who opt-in) to ensure we capture the preference even if users never create a full profile

**Code Structure**:

```javascript
// State
const marketingOptIn = ref(false)

// Save opt-in during signup
async function signUpToFirebase() {
  // ... existing account creation ...
  
  // After successful account creation, create minimal user document with marketing opt-in
  // This ensures we capture the preference even if user never creates a full profile
  if (userCredential.user) {
    await saveMarketingOptIn(userCredential.user.uid, marketingOptIn.value, 'signup')
  }
}
```

### 2. Account Settings Updates

**File**: `src/views/AccountView.vue`

- Add new "Email Preferences" section
- Add checkbox/toggle for marketing opt-in
- Load current opt-in status from user profile
- Auto-save when checkbox is toggled
- Show success message when saved

**Code Structure**:

```javascript
// State
const marketingOptIn = ref(false)
const marketingOptInLoading = ref(false)

// Load from profile
watch(userProfile, (profile) => {
  if (profile?.marketing_opt_in) {
    marketingOptIn.value = profile.marketing_opt_in.enabled
  }
})

// Save preference
async function saveMarketingOptInPreference() {
  marketingOptInLoading.value = true
  try {
    await saveMarketingOptIn(user.value.uid, marketingOptIn.value, 'settings')
    successMessage.value = 'Email preferences updated.'
  } catch (error) {
    console.error('Error saving marketing opt-in:', error)
  } finally {
    marketingOptInLoading.value = false
  }
}
```

### 3. Utility Functions

**File**: `src/utils/userProfile.js`

Add helper function to save marketing opt-in:

```javascript
/**
 * Save marketing email opt-in preference
 * @param {string} userId
 * @param {boolean} enabled
 * @param {'signup' | 'settings'} method
 */
export async function saveMarketingOptIn(userId, enabled, method) {
  if (!userId) throw new Error('User ID is required')
  
  try {
    const db = getFirestore()
    const optInData = {
      marketing_opt_in: {
        enabled,
        timestamp: new Date().toISOString(),
        method
      }
    }
    
    await setDoc(doc(db, 'users', userId), optInData, { merge: true })
    return optInData
  } catch (error) {
    console.error('Error saving marketing opt-in:', error)
    throw error
  }
}

/**
 * Check if user has opted in to marketing emails
 * @param {Object} userProfile - User profile document
 * @returns {boolean}
 */
export function hasMarketingOptIn(userProfile) {
  return userProfile?.marketing_opt_in?.enabled === true
}
```

### 4. Email Sending Logic

**Future Implementation**: When implementing marketing email sending (e.g., in Firebase Functions or email service), always check opt-in status:

```javascript
// Example: In email sending function
const userProfile = await getUserProfile(userId)
if (!hasMarketingOptIn(userProfile)) {
  // Skip sending marketing email
  return
}
// Proceed with sending marketing email
```

---

## UI/UX Design

### Signup Form Checkbox

- **Styling**: Match existing checkbox styling (same as Terms checkbox)
- **Text Color**: Gray-700 (same as Terms text)
- **Spacing**: Add margin-top: 1rem (space-y-4) between Terms and Marketing checkbox
- **Accessibility**: Proper label association, keyboard navigable

### Account Settings Section

- **Section Header**: "Email Preferences" with same styling as other sections (border-bottom, font-semibold)
- **Checkbox Layout**: 
  - Label on the right side of checkbox
  - Full width container
  - Loading state when saving
- **Success Feedback**: Use existing `NotificationBanner` component

---

## Testing Requirements

### Unit Tests

- [ ] `saveMarketingOptIn()` function saves correct data structure
- [ ] `hasMarketingOptIn()` correctly identifies opted-in users
- [ ] `hasMarketingOptIn()` returns false for users without field
- [ ] Timestamp is correctly formatted as ISO string

### Integration Tests

- [ ] Signup with marketing opt-in checked saves preference
- [ ] Signup with marketing opt-in unchecked saves preference as `enabled: false`
- [ ] Account settings loads current opt-in status correctly
- [ ] Toggling opt-in in account settings saves immediately
- [ ] Opt-in status persists after page reload

### E2E Tests (Cypress)

- [ ] Signup flow with marketing opt-in checked
- [ ] Signup flow with marketing opt-in unchecked
- [ ] Account settings displays current opt-in status
- [ ] Toggling opt-in in account settings updates Firestore
- [ ] Opt-in preference persists across sessions

### Test Data Attributes

- `data-cy="signup-marketing-opt-in"` - Signup checkbox
- `data-cy="account-marketing-opt-in"` - Account settings checkbox
- `data-cy="email-preferences-section"` - Email preferences section container

---

## Security & Privacy

### Data Protection

- Marketing opt-in status is stored in user's own document
- Only the user can update their own opt-in preference
- Firestore security rules must allow users to update their own `marketing_opt_in` field

### Firestore Security Rules

**No changes needed** to `firestore.rules`. The existing rule already allows users to write to their own document:

```javascript
match /users/{userId} {
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

This rule is sufficient and secure, as it only allows users to update their own document. It also supports the existing `updateUserProfile()` function which updates multiple profile fields.

### Compliance

- **GDPR**: Explicit opt-in required (not pre-checked)
- **CAN-SPAM**: Users can opt-out at any time
- **Clear Communication**: Users understand what they're opting into

---

## Success Metrics

- [ ] 100% of new signups have marketing opt-in preference recorded (even if false)
- [ ] Users can successfully toggle opt-in in account settings
- [ ] No marketing emails sent to users who haven't opted in
- [ ] Opt-in preference persists correctly across sessions

---

## Dependencies

- Existing user profile system (`src/utils/userProfile.js`)
- Existing account page (`src/views/AccountView.vue`)
- Existing signup page (`src/views/SignUpView.vue`)
- Firestore `users` collection
- Firestore security rules

---

## Future Enhancements

### Email Preferences Granularity

- Separate preferences for different email types:
  - Feature announcements
  - Product updates
  - Newsletter
  - Promotional emails

### Email Preference History

- Track opt-in/opt-out history
- Show when user last changed preference
- Admin view of opt-in rates

### Email Unsubscribe Links

- Add unsubscribe link to marketing emails
- One-click unsubscribe from email
- Redirect to account settings after unsubscribe

---

## Implementation Checklist

### Phase 1: Data Model & Utilities

- [ ] Add `saveMarketingOptIn()` function to `userProfile.js`
- [ ] Add `hasMarketingOptIn()` helper function
- [ ] Verify existing Firestore security rules support marketing_opt_in updates (no changes needed)
- [ ] Test utility functions

### Phase 2: Signup Integration

- [ ] Add marketing opt-in checkbox to `SignUpView.vue`
- [ ] Add state management for checkbox
- [ ] Integrate with signup flow to save preference
- [ ] Add Cypress test for signup with opt-in
- [ ] Add Cypress test for signup without opt-in

### Phase 3: Account Settings Integration

- [ ] Add "Email Preferences" section to `AccountView.vue`
- [ ] Add marketing opt-in toggle/checkbox
- [ ] Load current preference from user profile
- [ ] Implement auto-save on toggle
- [ ] Add success feedback
- [ ] Add Cypress test for account settings opt-in

### Phase 4: Testing & Validation

- [ ] Run all unit tests
- [ ] Run all integration tests
- [ ] Run all E2E tests
- [ ] Verify Firestore data structure
- [ ] Verify security rules
- [ ] Test with existing users (no marketing_opt_in field)

---

## Notes

- Marketing emails are **not** part of this spec - this only implements the opt-in mechanism
- Transactional emails (verification, password reset) are not affected by this preference
- The opt-in preference only affects marketing/announcement emails
- Users can change their preference at any time in account settings
- A minimal user document is created during signup for ALL users to capture marketing opt-in preference, even if they never create a full profile

