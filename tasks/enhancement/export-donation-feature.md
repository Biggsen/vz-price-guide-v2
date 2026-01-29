# Export Donation Feature - VZ Price Guide

## Overview

Add an optional one-time donation prompt within the ExportModal, allowing users to support the project when exporting price data. Uses Stripe Checkout for secure payment processing with preset amounts ($0, $10, $20, $50) and a custom amount option.

## Motivation

The export feature provides significant value to server administrators. An optional, non-intrusive donation prompt at the point of value delivery creates a natural opportunity for users to support the project's ongoing development and hosting costs.

---

## User Flow

### Standard Export (No Donation)

1. User opens ExportModal
2. Configures export options (version, categories, etc.)
3. Sees donation section with $0 selected by default
4. Clicks JSON/YAML button
5. File downloads immediately

### Export with Donation

1. User opens ExportModal
2. Configures export options
3. Selects donation amount ($10, $20, $50, or custom)
4. Clicks JSON/YAML button
5. Export config is saved to session/URL state
6. Redirects to Stripe Checkout
7. After successful payment → redirects to success page
8. Success page triggers file download automatically

### Cancelled/Failed Payment

1. User clicks cancel or payment fails on Stripe
2. Redirected back to app with `?donation_cancelled=true`
3. Export modal re-opens automatically
4. Brief, non-blocking message: "Donation cancelled — you can still export for $0"
5. Donation amount reset to $0
6. Export config preserved (version, categories, etc.)
7. User can immediately export or select a new donation amount

---

## UI Design

### Donation Section Location

In the ExportModal footer, above the existing button row:

```
┌─────────────────────────────────────────────────────┐
│ Export Price List                              [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Version selection]                                 │
│ [Categories]                                        │
│ [Sort/Price fields/Advanced options]                │
│ [Preview]                                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ☕ Love the guide? Buy us a coffee!                 │
│                                                     │
│ [$0]  [$10]  [$20]  [$50]  [Custom: $___]          │
│                                                     │
│ 156 items will be exported                          │
│                                                     │
│              [Cancel]  [JSON]  [YAML]               │
└─────────────────────────────────────────────────────┘
```

### Donation Amount Options

| Option    | Value      | Notes             |
| --------- | ---------- | ----------------- |
| No thanks | $0         | Default selection |
| Coffee    | $10        | First paid tier   |
| Lunch     | $20        | Mid-range         |
| Dinner    | $50        | Premium support   |
| Custom    | User input | Min $1, max $500  |

### Visual States

-   **Default**: $0 pill selected, muted styling
-   **Paid selected**: Highlighted pill, subtle thank-you text appears
-   **Custom selected**: Input field appears, validates on blur
-   **Processing**: Buttons show loading state, prevent double-click

---

## Technical Architecture

### Frontend Components

#### ExportModal.vue Changes

```javascript
// New refs
const donationAmount = ref(0)
const customAmount = ref('')
const isProcessingPayment = ref(false)
const donationPresets = [0, 10, 20, 50]

// Modified export function
async function handleExport(format) {
	if (donationAmount.value > 0) {
		await initiateCheckout(format)
	} else {
		exportFile(format)
	}
}
```

#### New: DonationSelector.vue (Optional)

Reusable component for donation amount selection:

-   Pill button group for presets
-   Custom amount input with validation
-   Emits `update:amount` event

### Backend: Firebase Cloud Function

#### New Function: `createDonationCheckout`

**Location**: `functions/index.js`

**Input**:

```json
{
	"amount": 1000,
	"currency": "usd",
	"exportConfig": {
		"format": "json",
		"version": "1.21",
		"categories": ["ores", "food"],
		"itemCount": 156
	},
	"successUrl": "https://...",
	"cancelUrl": "https://..."
}
```

**Output**:

```json
{
	"sessionId": "cs_xxx",
	"url": "https://checkout.stripe.com/..."
}
```

**Logic**:

1. Validate amount (100-50000 cents, i.e., $1-$500)
2. Create Stripe Checkout session with `mode: 'payment'`
3. Store export config in session metadata
4. Return checkout URL

#### New Function: `verifyDonationSession`

**Purpose**: Verify payment was successful before allowing export download. Called from success page.

**Input**:

```json
{
	"sessionId": "cs_xxx"
}
```

**Output**:

```json
{
	"verified": true,
	"amount": 1000,
	"currency": "usd"
}
```

**Logic**:

1. Retrieve Checkout Session from Stripe using `sessionId`
2. Verify `payment_status === "paid"`
3. Optionally verify amount matches allowed tiers
4. Return verification result

This approach avoids webhook complexity while preventing "fake success URL" abuse.

#### Future: `stripeWebhook`

For reliable donation tracking (deferred to post-MVP):

-   Listen for `checkout.session.completed`
-   Log donation to Firestore `donations` collection
-   Handle delayed payment methods
-   Send thank-you email

### New Route: Export Success Page

**Path**: `/export-success`

**Query params**: `?session_id={CHECKOUT_SESSION_ID}`

**Behaviour**:

1. Show loading state ("Verifying payment...")
2. Read `exportIntent` from sessionStorage
3. Call `verifyDonationSession` backend function with `session_id`
4. If verified:
    - Display thank-you message with donation amount
    - Regenerate export data using `exportIntent` config
    - Auto-trigger file download
    - Show manual download button as fallback
    - Clear `exportIntent` from sessionStorage
5. If verification fails:
    - Show error message
    - Provide link to return to export modal and retry

---

## Data Model

### Donations Collection (Optional - for tracking)

```yaml
/donations/{donationId}:
    userId: string | null        # null for guest donations
    email: string                # from Stripe
    amount: number               # in cents
    currency: string             # "usd"
    stripeSessionId: string
    exportConfig:
        format: string
        version: string
        itemCount: number
    createdAt: timestamp
    status: "completed" | "refunded"
```

### Session Storage (exportIntent pattern)

Before redirecting to Stripe, store the export configuration (not the data):

```javascript
sessionStorage.setItem(
	'exportIntent',
	JSON.stringify({
		format: 'json',
		version: '1.21',
		categories: ['ores', 'food'],
		priceFields: ['unit_buy', 'unit_sell'],
		sortField: 'default',
		sortDirection: 'asc',
		roundToWhole: false,
		includeMetadata: false,
		timestamp: Date.now() // For TTL check
	})
)
```

On success page:

1. Read `exportIntent` from sessionStorage
2. Verify session with backend (see `verifyDonationSession` function)
3. Regenerate export data using stored config
4. Trigger download
5. Clear `exportIntent`

**TTL**: Consider invalid if older than 30 minutes (Stripe sessions expire).

---

## Environment Configuration

### Frontend (.env files)

```bash
# Stripe publishable key (safe for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Optional: Enable/disable donation feature
VITE_DONATIONS_ENABLED=true
```

### Functions (Firebase environment/secrets)

```bash
# Set via Firebase CLI or Secret Manager
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

### env.production.example additions

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
VITE_DONATIONS_ENABLED=true
```

---

## Stripe Configuration

### Account Setup

1. Create Stripe account (or use existing)
2. Enable Checkout in Stripe Dashboard
3. Configure branding (logo, colours)
4. Webhook endpoint deferred to post-MVP

### Test Mode

-   Use test API keys during development
-   Test card: `4242 4242 4242 4242`
-   Any future expiry, any CVC

### Checkout Session Settings

```javascript
const session = await stripe.checkout.sessions.create({
	mode: 'payment',
	payment_method_types: ['card'],
	line_items: [
		{
			price_data: {
				currency: 'usd',
				product_data: {
					name: 'VZ Price Guide Donation',
					description: `Export support - ${itemCount} items`
				},
				unit_amount: amount // in cents
			},
			quantity: 1
		}
	],
	success_url: `${baseUrl}/export-success?session_id={CHECKOUT_SESSION_ID}`,
	cancel_url: `${baseUrl}/?donation_cancelled=true`, // Triggers modal re-open with message
	metadata: {
		exportFormat: format,
		exportVersion: version,
		itemCount: itemCount.toString()
	}
})
```

---

## Implementation Tasks

### Phase 1: Stripe Setup & Backend

-   [ ] **Task 1.1**: Add Stripe dependency to functions

    -   Add `stripe` to `functions/package.json`
    -   Configure Stripe API key in Firebase secrets

-   [ ] **Task 1.2**: Create `createDonationCheckout` Cloud Function

    -   Validate input (amount, URLs)
    -   Create Checkout session
    -   Return session URL
    -   Handle errors gracefully

-   [ ] **Task 1.3**: Create `verifyDonationSession` Cloud Function

    -   Accept `sessionId` parameter
    -   Retrieve session from Stripe API
    -   Verify `payment_status === "paid"`
    -   Return verification result

-   [ ] **Task 1.4**: Test functions locally
    -   Use Firebase emulator
    -   Verify Stripe test mode integration

### Phase 2: Frontend - Donation UI

-   [ ] **Task 2.1**: Add donation state to ExportModal

    -   `donationAmount` ref
    -   `customAmount` ref
    -   `isProcessingPayment` ref

-   [ ] **Task 2.2**: Create donation selector UI

    -   Pill buttons for preset amounts
    -   Custom amount input with validation
    -   Responsive layout (stack on mobile)

-   [ ] **Task 2.3**: Modify export button behaviour

    -   Check donation amount before export
    -   If $0, download immediately
    -   If >$0, call checkout function and redirect

-   [ ] **Task 2.4**: Add export config persistence
    -   Save config to sessionStorage before redirect
    -   Clear after successful download

### Phase 3: Success Page

-   [ ] **Task 3.1**: Create `ExportSuccessView.vue`

    -   Thank-you message with donation amount
    -   Loading state while verifying
    -   Error state if verification fails
    -   Auto-download trigger on success
    -   Manual download button fallback
    -   Link back to home

-   [ ] **Task 3.2**: Add route to router

    -   `/export-success` path
    -   Handle query params (`session_id`, `format`)

-   [ ] **Task 3.3**: Implement verification + download flow

    -   Read `exportIntent` from sessionStorage
    -   Call `verifyDonationSession` with `session_id`
    -   If verified: regenerate export data, trigger download
    -   If failed: show error, link to retry
    -   Clear `exportIntent` after download

### Phase 4: Analytics & Polish

-   [ ] **Task 4.1**: Add analytics events

    -   `donation_prompt_viewed`
    -   `donation_amount_selected`
    -   `donation_checkout_initiated`
    -   `donation_completed`
    -   `donation_cancelled`

-   [ ] **Task 4.2**: Handle edge cases

    -   Cancelled checkout return (show message, reset donation to $0, re-open modal)
    -   Browser back button during checkout
    -   `exportIntent` TTL expiry (30 min)
    -   Stripe session expiry

-   [ ] **Task 4.3**: Add feature flag
    -   `VITE_DONATIONS_ENABLED` environment variable
    -   Graceful degradation when disabled

### Phase 5: Testing

-   [ ] **Task 5.1**: Unit tests

    -   Donation amount validation
    -   Export config serialisation

-   [ ] **Task 5.2**: Component tests

    -   DonationSelector interactions
    -   ExportModal with donation flow

-   [ ] **Task 5.3**: E2E tests

    -   Full flow up to Stripe redirect
    -   Success page download trigger

-   [ ] **Task 5.4**: Manual Stripe testing
    -   Test card payments
    -   Verify webhook delivery (if implemented)

---

## Testing Strategy

### Local Development

1. Run Firebase emulator for functions
2. Use Stripe test mode keys
3. Test checkout flow with test cards

### Stripe CLI for Webhooks

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local function
stripe listen --forward-to localhost:5001/vz-price-guide/us-central1/stripeWebhook

# Trigger test events
stripe trigger checkout.session.completed
```

### Test Cards

| Scenario      | Card Number         |
| ------------- | ------------------- |
| Success       | 4242 4242 4242 4242 |
| Decline       | 4000 0000 0000 0002 |
| Auth required | 4000 0025 0000 3155 |

### E2E Test Approach

Since we can't complete Stripe Checkout in automated tests:

1. Test UI interactions up to checkout redirect
2. Mock the Cloud Function response
3. Test success page with mock session data
4. Manual testing for full payment flow

---

## Security Considerations

-   **Amount validation**: Server-side validation prevents manipulation (100-50000 cents)
-   **Session verification**: Backend verifies `payment_status === "paid"` before allowing download
-   **HTTPS only**: All Stripe communication over HTTPS
-   **No card data**: Card details never touch our servers (Stripe Checkout handles PCI compliance)
-   **Authenticated users only**: Same requirement as export feature
-   **Session metadata**: Don't store sensitive data in Stripe metadata

---

## Rollback Plan

If issues arise post-launch:

1. Set `VITE_DONATIONS_ENABLED=false` in production
2. Redeploy frontend
3. Donation UI hidden, export works normally
4. Investigate and fix issues
5. Re-enable when ready

---

## Success Metrics

| Metric                               | Target            |
| ------------------------------------ | ----------------- |
| Donation prompt impressions          | Track baseline    |
| Donation conversion rate             | 1-3% of exports   |
| Average donation amount              | $15-20            |
| Checkout completion rate             | >70% of initiated |
| Support tickets related to donations | <5/month          |

---

## Future Enhancements

-   [ ] Recurring donation/membership option
-   [ ] Donation leaderboard or recognition
-   [ ] Thank-you email with receipt
-   [ ] Donation history in user account
-   [ ] Alternative payment methods (PayPal, crypto)
-   [ ] Regional pricing

---

## Dependencies

| Dependency           | Version  | Purpose                |
| -------------------- | -------- | ---------------------- |
| `stripe` (functions) | ^14.x    | Stripe Node.js SDK     |
| Firebase Functions   | Existing | Backend infrastructure |
| Vue Router           | Existing | Success page routing   |

---

## Design Decisions

| Decision        | Choice                          | Rationale                                                                                              |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Guest donations | No - require verified account   | Same as export. Avoids ownership questions, rate limit abuse, "paid but didn't get file" support cases |
| Currency        | USD only                        | Simplicity for MVP                                                                                     |
| Receipts        | Stripe automatic                | No custom email infrastructure needed                                                                  |
| Refunds         | Honor all requests              | Good faith policy                                                                                      |
| Minimum amount  | $1                              | Stripe minimum, reasonable floor                                                                       |
| Webhook for MVP | No - verify session server-side | Simpler. Call Stripe API on success redirect to confirm `payment_status === "paid"`                    |
| Cancel UX       | Return to modal, reset to $0    | Low drama, no dead-end state                                                                           |

---

**Status**: 📋 Planning
**Priority**: Medium
**Dependencies**: Stripe account, Firebase Functions
**Estimated Effort**: 2-3 days implementation + testing
