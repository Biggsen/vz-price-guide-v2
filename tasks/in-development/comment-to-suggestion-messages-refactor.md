# Comment to SuggestionMessages Refactor

## Overview

Refactor the existing comment system to use `suggestionMessages` terminology and structure. This change improves semantic accuracy (messages vs comments) and prepares for future messaging features (forum messages, guild messages, etc.) by establishing a scoped, reusable pattern.

## Background

The current system uses "comment" terminology which is too specific for a system that handles both comments and replies. The term "message" is more generic and appropriate for the back-and-forth communication between users and admins.

## Goals

1. **Semantic Accuracy**: Use "message" instead of "comment" for better terminology
2. **Future-Proofing**: Establish scoped naming pattern for future messaging features
3. **Reusability**: Create reusable messaging components that can be adapted for forums, guilds, etc.
4. **Consistency**: Align terminology across codebase, UI, and database

## Scope

### Files to Refactor

#### Core Utility Files

-   `src/utils/comments.js` → `src/utils/suggestionMessages.js`
-   Update all function names and collection paths
-   Update Firestore collection reference from `comments` to `suggestionMessages`

#### Component Files

-   `src/components/CommentForm.vue` → `src/components/SuggestionMessageForm.vue`
-   `src/components/AdminCommentForm.vue` → `src/components/AdminSuggestionMessageForm.vue`
-   `src/components/CommentList.vue` → `src/components/SuggestionMessageList.vue`

#### View Files

-   `src/views/SuggestionsView.vue` - Update imports and component usage
-   `src/views/SuggestionsAdminView.vue` - Update imports and component usage

#### Configuration Files

-   `firestore.rules` - Update collection path and field validation

## Implementation Tasks

### Task 1: Create New Utility File

**File**: `src/utils/suggestionMessages.js`

**Changes**:

-   Rename file from `comments.js`
-   Update function names:
    -   `addComment` → `addSuggestionMessage`
    -   `updateComment` → `updateSuggestionMessage`
    -   `deleteComment` → `deleteSuggestionMessage`
    -   `getCommentsQuery` → `getSuggestionMessagesQuery`
    -   `formatCommentTime` → `formatSuggestionMessageTime`
-   Update collection path: `'comments'` → `'suggestionMessages'`
-   Update variable names: `comment` → `message`, `commentData` → `messageData`

### Task 2: Refactor Message Form Components

**Files**:

-   `src/components/SuggestionMessageForm.vue` (renamed from `CommentForm.vue`)
-   `src/components/AdminSuggestionMessageForm.vue` (renamed from `AdminCommentForm.vue`)

**Changes**:

-   Rename files and components
-   Update variable names: `commentText` → `messageText`, `submitComment` → `submitMessage`
-   Update emit events: `comment-added` → `suggestion-message-added`
-   Update import: `addComment` → `addSuggestionMessage`
-   Update placeholder text: "Add a reply..." → "Add a message..." (optional)
-   Update button text: "Post Reply" → "Post Message" (optional)

### Task 3: Refactor Message List Component

**File**: `src/components/SuggestionMessageList.vue` (renamed from `CommentList.vue`)

**Changes**:

-   Rename file and component
-   Update all variable names: `comments` → `messages`, `comment` → `message`
-   Update function names:
    -   `canEditComment` → `canEditMessage`
    -   `startEditComment` → `startEditMessage`
    -   `cancelEditComment` → `cancelEditMessage`
    -   `saveEditComment` → `saveEditMessage`
    -   `confirmDeleteComment` → `confirmDeleteMessage`
    -   `executeDeleteComment` → `executeDeleteMessage`
-   Update emit events: `comment-updated` → `suggestion-message-updated`, `comment-deleted` → `suggestion-message-deleted`
-   Update modal titles: "Delete Comment" → "Delete Message", "Edit Reply" → "Edit Message"
-   Update import: `updateComment`, `deleteComment` → `updateSuggestionMessage`, `deleteSuggestionMessage`

### Task 4: Update View Components

**Files**:

-   `src/views/SuggestionsView.vue`
-   `src/views/SuggestionsAdminView.vue`

**Changes**:

-   Update imports:
    -   `CommentForm` → `SuggestionMessageForm`
    -   `AdminCommentForm` → `AdminSuggestionMessageForm`
    -   `CommentList` → `SuggestionMessageList`
    -   `getCommentsQuery` → `getSuggestionMessagesQuery`
-   Update component usage in templates
-   Update variable names: `commentsData` → `messagesData`, `showCommentForm` → `showMessageForm`
-   Update function names: `toggleCommentForm` → `toggleMessageForm`, `handleCommentAdded` → `handleMessageAdded`
-   Update section heading: "Comments" → "Messages"
-   Update button text: "Add Comment" → "Add Message", "Reply" → "Add Message"

### Task 5: Update Firestore Rules

**File**: `firestore.rules`

**Changes**:

-   Update collection path: `comments` → `suggestionMessages` (line 73)
-   Update all references to comment-related fields and validation
-   Ensure all field validations remain the same

### Task 6: Update Documentation

**Files**: Update any documentation that references the commenting system

**Changes**:

-   Update task files that reference comments to use "suggestion messages" terminology
-   Update any API documentation or developer notes

## Database Migration

### Collection Path Change

```
Before: suggestions/{suggestionId}/comments/{commentId}
After:  suggestions/{suggestionId}/suggestionMessages/{messageId}
```

### Migration Strategy

1. **No data migration needed** - This is a collection path change only
2. **Update all client code** to use new collection path
3. **Deploy Firestore rules** with new collection path
4. **Old collection can be cleaned up** after verification

## Testing Requirements

### Unit Tests

-   [ ] Test all utility functions with new names
-   [ ] Test component props and events
-   [ ] Test Firestore collection path changes

### Integration Tests

-   [ ] Test message creation flow
-   [ ] Test message editing flow
-   [ ] Test message deletion flow
-   [ ] Test admin message creation flow

### E2E Tests

-   [ ] Test user message submission
-   [ ] Test admin message submission
-   [ ] Test message editing and deletion
-   [ ] Test message display and formatting

## Rollback Plan

If issues arise:

1. **Revert code changes** to use original `comments` collection
2. **Update Firestore rules** to point back to `comments` collection
3. **No data loss** - original collection remains intact

## Future Considerations

### Reusable Messaging Pattern

This refactor establishes a pattern for future messaging features:

-   **Forum Messages**: `src/utils/forumMessages.js`, `src/components/ForumMessageForm.vue`
-   **Guild Messages**: `src/utils/guildMessages.js`, `src/components/GuildMessageForm.vue`
-   **Expert Messages**: `src/utils/expertMessages.js`, `src/components/ExpertMessageForm.vue`

### Shared Messaging Utilities

Consider extracting common messaging functionality into shared utilities:

-   `src/utils/messaging.js` - Common message operations
-   `src/components/BaseMessageForm.vue` - Reusable message form component
-   `src/components/BaseMessageList.vue` - Reusable message list component

## Success Criteria

-   [ ] All comment references changed to suggestionMessages
-   [ ] All components renamed and updated
-   [ ] All utility functions renamed and updated
-   [ ] Firestore rules updated
-   [ ] All tests passing
-   [ ] No breaking changes to existing functionality
-   [ ] UI terminology updated consistently
-   [ ] Database collection path updated

## Dependencies

-   No external dependencies
-   Requires coordination with any active development on suggestions feature
-   May require updating any existing documentation or API references

## Timeline

**Estimated effort**: 4-6 hours

-   File renaming and imports: 1 hour
-   Function and variable renaming: 2 hours
-   Testing and verification: 1-2 hours
-   Documentation updates: 1 hour

## Notes

-   This is a pure refactoring with no functional changes
-   All existing data remains accessible
-   UI behavior remains identical
-   Only terminology and naming changes
