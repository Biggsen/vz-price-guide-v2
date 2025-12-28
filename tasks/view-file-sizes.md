# View File Sizes

This document contains the line count data for all Vue view files in the project as of the current analysis.

## Main Views Directory (`src/views/`)

| File                         | Lines     | Description                                         |
| ---------------------------- | --------- | --------------------------------------------------- |
| **CrateSingleView.vue**      | **2,853** | **Largest view file - Complex crate functionality** |
| PrivacyPolicyView.vue        | 1,906     | Privacy policy content                              |
| ShopItemsView.vue            | 1,832     | Shop items management                               |
| StyleguideView.vue           | 1,573     | Style guide documentation                           |
| ShopManagerView.vue          | 1,408     | Shop management                                     |
| MarketOverviewView.vue       | 1,347     | Market overview display                             |
| TermsOfUseView.vue           | 1,273     | Terms of use content                                |
| BulkUpdateItemsView.vue      | 1,247     | Bulk item update functionality                      |
| YamlImportDevView.vue        | 1,069     | YAML import development tools                       |
| CrateRewardManagerView.vue   | 1,041     | Crate reward management                             |
| VisualGalleryView.vue        | 703       | Visual gallery display                              |
| EditItemView.vue             | 695       | Item editing functionality                          |
| AddItemView.vue              | 632       | Add new item functionality                          |
| EditRecipeView.vue           | 630       | Recipe editing                                      |
| SuggestionsView.vue          | 535       | Suggestions display                                 |
| SuggestionsAdminView.vue     | 520       | Admin suggestions management                        |
| CookiePolicyView.vue         | 477       | Cookie policy content                               |
| AccountView.vue              | 442       | User account management                             |
| MissingItemsView.vue         | 399       | Missing items display                               |
| ToolsView.vue                | 389       | Tools page                                          |
| UpdatesView.vue              | 388       | Updates display                                     |
| SignUpView.vue               | 361       | User registration                                   |
| HomeView.vue                 | 354       | Homepage view                                       |
| ResetPasswordConfirmView.vue | 341       | Password reset confirmation                         |
| ChangePasswordView.vue       | 336       | Password change functionality                       |
| SignInView.vue               | 239       | User login                                          |
| AccessManagementView.vue     | 223       | Access management functionality                     |
| VerifyEmailSuccessView.vue   | 194       | Email verification success                          |
| AdminView.vue                | 167       | Admin panel                                         |
| ResetPasswordView.vue        | 163       | Password reset request                              |
| VerifyEmailView.vue          | 123       | Email verification                                  |
| DesignView.vue               | 65        | Design documentation                                |
| CommunityView.vue            | 52        | Community page                                      |
| NotFoundView.vue             | 48        | 404 error page                                      |
| RestrictedAccessView.vue     | 30        | Restricted access message                           |

## Recipes Subdirectory (`src/views/recipes/`)

| File                      | Lines | Description                 |
| ------------------------- | ----- | --------------------------- |
| RecipeImportView.vue      | 783   | Recipe import functionality |
| RecipeManageView.vue      | 438   | Recipe management           |
| RecipeRecalculateView.vue | 397   | Recipe recalculation        |

## Summary

-   **Total view files**: 38 files
-   **Largest file**: CrateSingleView.vue (2,853 lines)
-   **Average file size**: ~650 lines
-   **Files over 1,000 lines**: 10 files
-   **Files under 100 lines**: 4 files

## Notes

-   The CrateSingleView.vue file is significantly larger than others, suggesting it may benefit from refactoring into smaller components
-   ShopItemsView.vue and ShopManagerView.vue have grown significantly and may benefit from refactoring
-   Privacy policy and terms of use files are large due to content, not complexity
-   Most functional views (CRUD operations, management) range from 200-800 lines
-   The recipes subdirectory contains moderately complex views for recipe management
-   Several views have grown substantially since the last analysis, indicating active development

_Generated on: January 2025_
