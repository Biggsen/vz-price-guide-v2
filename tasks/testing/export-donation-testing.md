# Export Donation Feature - Testing Specification

**Status**: Ready to implement
**Related Feature**: [Export Donation Feature](../enhancement/export-donation-feature.md)

## Overview

Testing specification for the export donation feature, covering unit tests for utility functions, E2E tests for user flows, and manual Stripe payment testing.

## Goals

-   Validate donation amount handling and currency localization
-   Test export config persistence (sessionStorage) and recovery
-   Verify idempotency protection against duplicate downloads
-   Test user flows up to Stripe redirect (mocked)
-   Test success page verification and download flow
-   Test cancelled checkout flow

---

## Scope

### Unit Tests

Test the utility functions in `src/utils/donations.js`:

-   [ ] **Donation amount validation**

    -   Preset amounts (0, 10, 20, 50) are valid
    -   Custom amounts within range (1-500) are valid
    -   Amounts below minimum (< 1) are rejected
    -   Amounts above maximum (> 500) are rejected
    -   Non-numeric values are rejected

-   [ ] **Currency detection**

    -   `en-GB` locale returns GBP (£)
    -   EU locales (de, fr, es, it, etc.) return EUR (€)
    -   `en-US`, `en-CA`, `en-AU` return USD ($)
    -   Unknown locales fallback to USD ($)

-   [ ] **Export config serialization**

    -   `saveExportIntent()` stores config with timestamp
    -   `getExportIntent()` retrieves valid config
    -   Config includes all required fields (format, version, categories, etc.)

-   [ ] **TTL checking logic**

    -   Fresh config (< 30 min) is returned
    -   Expired config (> 30 min) returns null
    -   `clearExportIntent()` removes config

-   [ ] **Idempotency key logic**
    -   `hasSessionBeenDownloaded()` returns false for new session
    -   `markSessionAsDownloaded()` stores session ID
    -   `hasSessionBeenDownloaded()` returns true after marking
    -   Only last 50 sessions are retained

### E2E Tests (Cypress)

Test user flows with mocked Cloud Function responses:

-   [ ] **Export modal donation UI**

    -   Donation selector appears for authenticated users
    -   Currency symbol matches detected locale
    -   Preset buttons are clickable and update selection
    -   Custom amount input validates on blur
    -   Thank-you message appears when paid amount selected

-   [ ] **Free export flow (no donation)**

    -   Select $0 (free)
    -   Click Export JSON/YAML
    -   File downloads immediately (no redirect)

-   [ ] **Donation checkout flow (mocked)**

    -   Select paid amount ($10, $20, $50, or custom)
    -   Click Export button
    -   Loading state appears
    -   Mock `createDonationCheckout` response
    -   Verify redirect URL is called (intercept, don't follow)

-   [ ] **Success page with mock verification**

    -   Navigate to `/export-success?session_id=mock_session`
    -   Mock `verifyDonationSession` to return verified
    -   Thank-you message displays with amount
    -   File auto-downloads
    -   "Return to Price Guide" button works

-   [ ] **Success page verification failure**

    -   Mock `verifyDonationSession` to return unverified
    -   Error message displays
    -   "Try Export Again" button links to home with modal

-   [ ] **Cancelled checkout flow**
    -   Navigate to `/?donation_cancelled=true`
    -   Export modal opens automatically
    -   Donation amount reset to $0
    -   User can immediately export

---

## Manual Stripe Testing

These tests require actual Stripe test mode and cannot be automated:

### Test Cards

| Scenario      | Card Number         | Expected Result                            |
| ------------- | ------------------- | ------------------------------------------ |
| Success       | 4242 4242 4242 4242 | Payment succeeds, redirect to success page |
| Decline       | 4000 0000 0000 0002 | Payment fails, user sees error             |
| Auth required | 4000 0025 0000 3155 | 3D Secure modal appears                    |

Use any future expiry date and any CVC.

### Manual Test Checklist

-   [ ] **Happy path - USD**

    1. Open export modal as verified user
    2. Select $10
    3. Click Export JSON
    4. Complete Stripe checkout with success card
    5. Verify success page shows "Thank you" with $10.00
    6. Verify file downloads automatically
    7. Refresh page - should redirect to home (idempotency)

-   [ ] **Happy path - GBP** (change browser locale to en-GB)

    1. Verify donation buttons show £0, £10, £20, £50
    2. Complete checkout
    3. Verify success page shows amount in £

-   [ ] **Happy path - EUR** (change browser locale to de-DE)

    1. Verify donation buttons show €0, €10, €20, €50
    2. Complete checkout
    3. Verify success page shows amount in €

-   [ ] **Custom amount**

    1. Click "Amount" button
    2. Enter "25"
    3. Complete checkout
    4. Verify success page shows correct amount

-   [ ] **Cancelled checkout**

    1. Select $20, click Export
    2. On Stripe page, click back/cancel
    3. Verify return to app with modal open
    4. Verify donation reset to $0

-   [ ] **Declined payment**

    1. Select $10, click Export
    2. Use decline test card
    3. Verify error message on Stripe
    4. Return to app still works

-   [ ] **Session expiry fallback**

    1. Select $10, click Export
    2. Clear sessionStorage in DevTools
    3. Complete Stripe checkout
    4. Verify success page recovers config from Stripe metadata

-   [ ] **Browser back during checkout**
    1. Select $10, click Export
    2. On Stripe page, use browser back button
    3. Verify app handles gracefully

---

## Testing Infrastructure

### Mocking Strategy

For E2E tests, mock the Firebase Cloud Functions:

```javascript
// cypress/support/commands.js
Cypress.Commands.add('mockDonationCheckout', (response = {}) => {
	cy.intercept('POST', '**/createDonationCheckout', {
		statusCode: 200,
		body: {
			result: {
				sessionId: 'cs_test_mock',
				url: 'https://checkout.stripe.com/mock'
			}
		},
		...response
	})
})

Cypress.Commands.add('mockVerifySession', (verified = true, amount = 1000) => {
	cy.intercept('POST', '**/verifyDonationSession', {
		statusCode: 200,
		body: {
			result: {
				verified,
				amount,
				currency: 'usd',
				metadata: {
					exportFormat: 'json',
					exportVersion: '1.21'
				}
			}
		}
	})
})
```

### Unit Test Setup

Tests for `donations.js` utilities using Vitest:

```javascript
// src/utils/__tests__/donations.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
	detectCurrency,
	saveExportIntent,
	getExportIntent,
	clearExportIntent,
	hasSessionBeenDownloaded,
	markSessionAsDownloaded
} from '../donations'

describe('detectCurrency', () => {
	it('returns GBP for en-GB locale', () => {
		vi.stubGlobal('navigator', { language: 'en-GB' })
		expect(detectCurrency()).toEqual({ code: 'gbp', symbol: '£' })
	})

	it('returns EUR for German locale', () => {
		vi.stubGlobal('navigator', { language: 'de-DE' })
		expect(detectCurrency()).toEqual({ code: 'eur', symbol: '€' })
	})

	it('returns USD for en-US locale', () => {
		vi.stubGlobal('navigator', { language: 'en-US' })
		expect(detectCurrency()).toEqual({ code: 'usd', symbol: '$' })
	})

	it('defaults to USD for unknown locales', () => {
		vi.stubGlobal('navigator', { language: 'zh-CN' })
		expect(detectCurrency()).toEqual({ code: 'usd', symbol: '$' })
	})
})

describe('exportIntent', () => {
	beforeEach(() => {
		sessionStorage.clear()
	})

	it('saves and retrieves config', () => {
		const config = { format: 'json', version: '1.21' }
		saveExportIntent(config)
		const retrieved = getExportIntent()
		expect(retrieved.format).toBe('json')
		expect(retrieved.version).toBe('1.21')
	})

	it('returns null for expired config', () => {
		const config = { format: 'json', timestamp: Date.now() - 31 * 60 * 1000 }
		sessionStorage.setItem('exportIntent', JSON.stringify(config))
		expect(getExportIntent()).toBeNull()
	})

	it('clears config', () => {
		saveExportIntent({ format: 'json' })
		clearExportIntent()
		expect(getExportIntent()).toBeNull()
	})
})

describe('idempotency', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('tracks downloaded sessions', () => {
		expect(hasSessionBeenDownloaded('sess_123')).toBe(false)
		markSessionAsDownloaded('sess_123')
		expect(hasSessionBeenDownloaded('sess_123')).toBe(true)
	})

	it('keeps only last 50 sessions', () => {
		for (let i = 0; i < 60; i++) {
			markSessionAsDownloaded(`sess_${i}`)
		}
		expect(hasSessionBeenDownloaded('sess_0')).toBe(false)
		expect(hasSessionBeenDownloaded('sess_59')).toBe(true)
	})
})
```

---

## Implementation Tasks

-   [ ] **Task 1**: Create unit tests for `donations.js` utilities
-   [ ] **Task 2**: Create Cypress commands for mocking donation functions
-   [ ] **Task 3**: Create E2E test for donation UI interactions
-   [ ] **Task 4**: Create E2E test for free export flow
-   [ ] **Task 5**: Create E2E test for success page (mocked)
-   [ ] **Task 6**: Create E2E test for cancelled checkout flow
-   [ ] **Task 7**: Complete manual Stripe testing checklist
-   [ ] **Task 8**: Document any edge cases discovered during testing

---

## Success Criteria

-   All unit tests pass
-   All E2E tests pass with mocked responses
-   Manual Stripe testing checklist completed
-   No regressions in existing export functionality
-   Edge cases documented and handled
