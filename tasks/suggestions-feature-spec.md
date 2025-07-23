# Suggestions Feature Specification

## Overview

The Suggestions feature allows authenticated and verified users to submit feedback, feature requests, or tweaks to the site owners. Admins can view all suggestions and update their status. The current implementation is a simpler system than originally specified.

---

## Current Implementation (as of July 2025)

### Users

-   Can submit new suggestions (title, body) if their email is verified.
-   Can view a list of their own previous suggestions.
-   Can edit or soft-delete their own suggestions (if status is 'open').
-   Cannot comment or reply to admin (no threaded conversation).
-   Cannot see admin comments (no comment system implemented).
-   Can see the status of their suggestions (open, in progress, closed, rejected).

### Admins

-   Can view all suggestions from all users.
-   Can filter by active/deleted suggestions.
-   Can update the status of a suggestion (open, in progress, closed, rejected).
-   Can hard-delete suggestions.
-   Can see user info for each suggestion (display name, Minecraft username, email).
-   Cannot comment or reply to suggestions (no comment system implemented).

### Data Model (Firestore)

-   **Collection:** `suggestions`
    -   **Fields:**
        -   `userId`: string
        -   `userDisplayName`: string
        -   `createdAt`: timestamp
        -   `status`: string (open, in progress, closed, rejected)
        -   `title`: string
        -   `body`: string
        -   `deleted`: boolean (soft delete)
    -   **No subcollection for comments** (not implemented)

### UI/UX

-   User page (`/suggestions`):
    -   Form to submit a new suggestion (title, body).
    -   List of user's suggestions, with edit/delete if open.
    -   No comment threads or replies.
-   Admin page (`/suggestions/all`):
    -   List of all suggestions, filterable by status/deleted.
    -   Status update buttons.
    -   No comment threads or replies.
-   No suggestion detail or threaded view.

### Routing

-   `/suggestions` – User's suggestions page (requiresAuth, requiresVerification)
-   `/suggestions/all` – Admin view (requiresAuth, requiresAdmin)
-   No `/suggestions/:id` detail route.

### Validation

-   Title and body required for suggestions (length limits enforced).
-   No comments, so no comment validation.

### Security

-   Only authenticated and verified users can submit/view their suggestions.
-   Only admins can view all suggestions and update status.
-   Users can only edit/delete their own suggestions.
-   Proper Firestore security rules to enforce access control.

### Accessibility

-   All forms and lists accessible, keyboard navigable, with ARIA labels.

---

## Outstanding/Not Implemented

-   **Commenting system:** No admin/user comments or threaded conversations.
-   **Suggestion detail view:** No `/suggestions/:id` route or threaded view.
-   **Reply functionality:** Not available for either user or admin.
-   **Admin search/filter by keyword or user:** Only basic filtering by status/deleted.
-   **Notifications:** No email or in-app notifications for status changes.
-   **Status badges/filtering for user list:** Only basic status shown.

---

## Optional Enhancements (Future)

-   Add comment threads and replies (with subcollection in Firestore).
-   Add suggestion detail view and threaded UI.
-   Add notifications for status changes or admin comments.
-   Add advanced filtering/search for admins.
-   Add status badges and improved filtering for users.
