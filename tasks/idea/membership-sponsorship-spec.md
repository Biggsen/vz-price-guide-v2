# 💡 Hybrid Membership + Category Sponsorship System

## Overview
This specification outlines the implementation of a **membership and sponsorship** system for the VZ Price Guide. The goal is to allow users to support the project financially while unlocking exclusive features and receiving public recognition for keeping categories "online."

---

## 🧩 Core Concept

- **Membership**: Grants access to premium site content (e.g., advanced exports, analytics, tools).
- **Sponsorship**: Allows members to select specific categories to support and be recognized for their contribution.
- **Recognition**: Display “Courtesy of @username” or “Featured supporter: @username” on category pages.

---

## 🧱 Architecture Summary

### Frontend
- Vue 3 + Firebase integration (existing stack)
- Membership dashboard and checkout integration
- Real-time display of sponsored categories

### Backend
- Firebase Firestore for data
- Firebase Functions for secure operations
- Stripe for payments, subscriptions, and webhooks

---

## 💰 Pricing Model

| Tier | Price | Included | Notes |
|------|--------|-----------|-------|
| **Basic** | $4/month | Site access + 1 sponsored category | Entry tier |
| **Supporter+** | $8/month | Site access + 3 sponsored categories | Enhanced perks |
| **Add-on** | $1.50/month | Each additional sponsored category | Optional extras |

---

## 🗃 Firestore Structure

```yaml
/users/{uid}:
  stripeCustomerId: string
  membershipTier: "basic" | "supporter" | "pro"
  active: true
  sponsoredCategories: ["ores", "food", "plants"]
  memberSince: timestamp

/memberships/{uid}:
  subscriptionId: string
  activeCategories: ["ores", "food"]
  maxCategories: 3
  currentPeriodEnd: timestamp

/categories/{categoryKey}:
  sponsors: [ { uid: string, displayName: string, amount: number } ]
  featuredUid: string
  featuredUntil: timestamp
```

---

## ⚙️ Flow Summary

1. **User selects membership tier** (Basic, Supporter+, etc.)
2. **Chooses categories** to support
3. **Stripe Checkout** session is created with base membership + add-ons
4. **Webhook** activates membership and updates Firestore
5. Category pages update to display sponsor recognition

---

## 🧾 Stripe Setup

### Products & Prices

| Product | Type | Price | Metadata |
|----------|------|--------|-----------|
| VZPG Membership Basic | Recurring | $4/mo | `{ tier: "basic" }` |
| VZPG Membership Supporter+ | Recurring | $8/mo | `{ tier: "supporter" }` |
| Category Sponsorship Add-on | Recurring | $1.50/mo | `{ type: "addon" }` |

Each category sponsorship is tracked by metadata linking to the `categoryKey`.

---

## 🧠 API Endpoints

### **POST /membership/checkout**
Creates a Stripe Checkout Session.

**Input:**
```json
{
  "uid": "abc123",
  "tier": "basic",
  "categories": ["ores", "wood"],
  "successUrl": "...",
  "cancelUrl": "..."
}
```

**Server actions:**
- Validate selected categories and tier
- Ensure user has a Stripe customer ID
- Create Checkout Session with appropriate prices
- Store temporary "holds" for categories

**Output:**
```json
{
  "url": "https://checkout.stripe.com/session/abc123"
}
```

---

### **POST /membership/modify**
Updates an existing subscription (adds/removes sponsored categories).

**Input:**
```json
{
  "uid": "abc123",
  "add": ["plants"],
  "remove": ["wood"]
}
```

**Server actions:**
- Fetch user’s subscription
- Update Stripe subscription items
- Sync Firestore records

---

## 🔁 Webhooks

### **checkout.session.completed**
- Activates membership tier
- Registers sponsored categories
- Writes `/memberships/{uid}` and `/categories/{key}` data

### **customer.subscription.updated**
- Handles category changes or tier upgrades
- Syncs active categories

### **customer.subscription.deleted**
- Revokes membership access and sponsorships after the current billing period

### **invoice.payment_failed**
- Optionally sends reminder or marks membership inactive

---

## 🔐 Access Control

In Firebase Rules and Vue route guards:

```js
if (user.membershipTier !== "basic" && route.meta.requiresMembership)
  redirectToPaywall()
```

---

## 🧭 Display Rules

- On category pages:  
  `Food is online thanks to 12 members · Featured: @MapleSmith`
- On user profile:  
  “You’re supporting 3 categories: Food, Ores, Plants.”
- Featured supporter rotates daily or weighted by tier/tenure.

---

## 🧮 Scheduled Jobs

- **Nightly rotation** of `featuredUid` among active supporters.
- **Hold cleanup** (expire unused holds after 15 minutes).

---

## 🧰 Admin Tools

- View all active memberships
- Manually feature supporters
- Adjust category sponsorship caps
- Manage pending holds

---

## 🧑‍💻 Developer Notes

- Keep one subscription per user.
- All add-ons are subscription items.
- Use `metadata.categoryKey` to link items to categories.
- Make all Firestore writes transactional (category hold → sponsorship).

---

## ✅ Deliverables

- [ ] Stripe products created (Basic, Supporter+, Add-on)
- [ ] Firebase Functions: `/membership/checkout`, `/membership/modify`
- [ ] Webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Category recognition UI
- [ ] Membership dashboard (manage categories, billing)
- [ ] Nightly feature rotation job

---

**Author:** VZ Price Guide  
**Date:** November 2025  
**Version:** 1.0.0  
