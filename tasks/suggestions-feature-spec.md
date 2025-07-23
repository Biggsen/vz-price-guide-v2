# Suggestions Feature Specification

## Overview

The Suggestions feature allows authenticated users to submit feedback, feature requests, or tweaks to the site owners. Users can view and reply to admin comments on their suggestions. Admins can view all suggestions, comment, and update their status.

---

## User Stories

### Users

-   Can submit new suggestions (title, body).
-   Can view a list of their own previous suggestions.
-   Can see admin comments on their suggestions.
-   Can reply to admin comments (threaded conversation per suggestion).
-   Can submit multiple suggestions.

### Admins

-   Can view all suggestions from all users.
-   Can filter/search suggestions by status, user, or keyword.
-   Can comment on any suggestion (threaded conversation).
-   Can update the status of a suggestion (open, in progress, closed, rejected).
-   Can see user info for each suggestion.

---

## Data Model (Firestore)

-   **Collection:** `suggestions`
    -   **Fields:**
        -   `userId`: string
        -   `userDisplayName`: string
        -   `createdAt`: timestamp
        -   `updatedAt`: timestamp
        -   `status`: string (open, in progress, closed, rejected)
        -   `title`: string
        -   `body`: string
    -   **Subcollection:** `comments`
        -   Each comment document:
            -   `authorId`: string
            -   `authorDisplayName`: string
            -   `role`: string (user/admin)
            -   `body`: string
            -   `createdAt`: timestamp
            -   `parentId`: string|null (for replies, null for top-level)

---

## UI/UX

### User Page (`/suggestions`)

-   Form to submit a new suggestion (title, body).
-   List of user's suggestions, expandable to show comment threads.
-   Reply box under each admin comment.

### Admin Page (`/suggestions/all`)

-   Table/list of all suggestions, sortable and filterable.
-   Click to view suggestion details and comment thread.
-   Status update dropdown.
-   Reply box for admin comments.

### Suggestion Detail (`/suggestions/:id`)

-   Threaded view of suggestion and all comments.
-   Reply functionality for both user and admin (with permissions).

---

## Routing

-   `/suggestions` – User's suggestions page (requiresAuth)
-   `/suggestions/all` – Admin view (requiresAuth, requiresAdmin)
-   `/suggestions/:id` – Detail view (both user and admin, with permissions)

---

## Validation

-   Title and body required for suggestions (length limits enforced).
-   Comments required, with length limits.

---

## Security

-   Only authenticated users can submit/view their suggestions.
-   Only admins can view all suggestions and update status.
-   Users can only reply to their own suggestions.
-   Proper Firestore security rules to enforce access control.

---

## Accessibility

-   All forms and threads accessible, keyboard navigable, with ARIA labels.

---

## Optional Enhancements

-   Email or in-app notification when admin comments or status changes.
-   Status badges and filtering for user suggestions list.
