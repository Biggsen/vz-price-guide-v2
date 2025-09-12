# Suggestions Feature Enhancements (Post-MVP)

## Overview

The Suggestions MVP is live (submission, user list, admin list, status updates, soft/hard delete). This document tracks outstanding capabilities not included in the MVP and optional enhancements for a richer workflow.

## Scope

-   Comment threads (admin ↔ user)
-   Suggestion detail view and threaded UI
-   Reply workflows and notifications
-   Admin advanced search/filter
-   Status badges and improved filtering for users

---

## Work Items

### 1) Commenting and Threads

-   [ ] Add comments subcollection
    -   Path: `suggestions/{suggestionId}/comments/{commentId}`
    -   Fields: `authorId`, `authorRole` ('user' | 'admin'), `body`, `createdAt`, `editedAt`, `deleted`
-   [ ] Threaded UI in detail view
-   [ ] Role-based styling and visibility
-   [ ] Edit/delete own comments (soft delete)

### 2) Suggestion Detail View

-   [ ] Route: `/suggestions/:id`
-   [ ] Show suggestion meta (status, author, timestamps)
-   [ ] Comments thread (above)
-   [ ] Status history (optional)

### 3) Reply and Status Workflows

-   [ ] Admin reply from detail view
-   [ ] User follow-up comments
-   [ ] Status change notes (optional field on status updates)

### 4) Admin Advanced Search/Filter

-   [ ] Keyword search (title/body) with Firestore indexing strategy
-   [ ] Filter by user (uid/display name)
-   [ ] Combined filters (status, deleted, createdAt range)

### 5) Notifications (Optional)

-   [ ] Email or in-app notifications on admin reply or status change
-   [ ] Notification preferences in user settings (integrates with user-accounts enhancements)

### 6) Status Badges and User Filtering

-   [ ] Badges for `open`, `in progress`, `closed`, `rejected`
-   [ ] Client-side filtering on user list

---

## Data Model

### Existing `suggestions` collection (MVP)

```
suggestions: {
  userId: string,
  userDisplayName: string,
  createdAt: timestamp,
  status: 'open' | 'in progress' | 'closed' | 'rejected',
  title: string,
  body: string,
  deleted: boolean
}
```

### New `comments` subcollection

```
suggestions/{suggestionId}/comments: {
  authorId: string,
  authorRole: 'user' | 'admin',
  body: string,
  createdAt: timestamp,
  editedAt?: timestamp,
  deleted: boolean
}
```

---

## Security Rules

-   [ ] Users can read their own suggestions; admins can read all
-   [ ] Users can create comments on their own suggestions; admins on any
-   [ ] Users can edit/delete only their own comments; admins moderate
-   [ ] Enforce `requiresVerification` for creating suggestions/comments

---

## Routing

-   [ ] `/suggestions` – user list and create
-   [ ] `/suggestions/:id` – detail + thread (auth + verification)
-   [ ] `/suggestions/all` – admin list with advanced filters (auth + admin)

---

## UI/UX

-   [ ] Threaded comments with role styling
-   [ ] Badges and filters on user/admin lists
-   [ ] Status change UX with optional note

---

## Testing Checklist

-   [ ] Create/read/update/delete comments permissions enforced
-   [ ] Detail view loads suggestion + comments
-   [ ] Admin advanced filters/search work as expected
-   [ ] Optional notifications sent and can be opted out

---

## Success Metrics

-   [ ] ≤1% authorization errors in comment/detail actions (30-day rolling)
-   [ ] <300ms median load time for detail view (suggestion + first page of comments)
-   [ ] ≥90% feature discoverability (users use detail view for follow-ups)

---

## Dependencies

-   Firestore security rules
-   Existing suggestions MVP views and collections
-   Optional: user-accounts enhancements for email preferences
