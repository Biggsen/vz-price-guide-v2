# Suggestions Feature (MVP) – Completed

## Overview

The Suggestions MVP provides a streamlined channel for verified users to submit suggestions and for admins to manage them. It intentionally omits commenting/threads, notifications, and advanced search.

---

## Delivered Functionality

### Users

-   Submit new suggestions (title, body) when email is verified
-   View list of own suggestions
-   Edit or soft-delete own suggestions when status is `open`
-   View status for each suggestion: `open`, `in progress`, `closed`, `rejected`

### Admins

-   View all suggestions across users
-   Filter by active/deleted
-   Update status (`open`, `in progress`, `closed`, `rejected`)
-   Hard-delete suggestions
-   See user info (display name, Minecraft username, email)

### Data Model (Firestore)

-   Collection: `suggestions`
    -   `userId`: string
    -   `userDisplayName`: string
    -   `createdAt`: timestamp
    -   `status`: 'open' | 'in progress' | 'closed' | 'rejected'
    -   `title`: string
    -   `body`: string
    -   `deleted`: boolean (soft delete)
    -   No comments subcollection

### UI/UX

-   User page (`/suggestions`):
    -   Form to create a suggestion (title, body)
    -   List of user's suggestions with edit/delete if open
    -   No comment threads or replies
-   Admin page (`/suggestions/all`):
    -   List of all suggestions, filterable by status/deleted
    -   Status update controls
    -   No comment threads or replies

### Routing

-   `/suggestions` – User page (requiresAuth, requiresVerification)
-   `/suggestions/all` – Admin view (requiresAuth, requiresAdmin)
-   No `/suggestions/:id` detail route

### Validation

-   Title and body required with length limits

### Security

-   Only authenticated and verified users can submit/view their suggestions
-   Only admins can view all suggestions and update statuses
-   Users can only edit/delete their own suggestions

### Accessibility

-   Forms and lists are keyboard accessible and labeled appropriately

---

## Notes

Outstanding capabilities and optional enhancements are tracked in `tasks/suggestions-feature-enhancements.md`.
