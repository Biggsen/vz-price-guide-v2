# View File Sizes

This document contains the line count data for all Vue view files in the project as of the current analysis.

## Main Views Directory (`src/views/`)

| File                         | Lines     | Description                                         |
| ---------------------------- | --------- | --------------------------------------------------- |
| **ShopItemsView.vue**        | **1,997** | **Largest view file - Shop items management**      |
| PrivacyPolicyView.vue        | 1,906     | Privacy policy content                              |
| MarketOverviewView.vue       | 1,598     | Market overview display                             |
| StyleguideView.vue           | 1,573     | Style guide documentation                           |
| ShopManagerView.vue          | 1,425     | Shop management                                     |
| TermsOfUseView.vue           | 1,273     | Terms of use content                                |
| BulkUpdateItemsView.vue      | 1,247     | Bulk item update functionality                      |
| VisualGalleryView.vue        | 703       | Visual gallery display                              |
| EditItemView.vue             | 695       | Item editing functionality                          |
| AddItemView.vue              | 632       | Add new item functionality                          |
| EditRecipeView.vue           | 630       | Recipe editing                                      |
| HomeView.vue                 | 578       | Homepage view                                       |
| SuggestionsView.vue         | 535       | Suggestions display                                 |
| AccountView.vue              | 516       | User account management                             |
| SuggestionsAdminView.vue     | 520       | Admin suggestions management                        |
| CookiePolicyView.vue         | 477       | Cookie policy content                               |
| MissingItemsView.vue         | 399       | Missing items display                               |
| SignUpView.vue               | 399       | User registration                                   |
| ToolsView.vue                | 90        | Tools page (external utilities)                     |
| UpdatesView.vue              | 388       | Updates display                                     |
| ShopManagerStatsView.vue     | 352       | Shop manager statistics                             |
| ResetPasswordConfirmView.vue | 341       | Password reset confirmation                         |
| ChangePasswordView.vue       | 336       | Password change functionality                       |
| SignInView.vue               | 239       | User login                                          |
| AdminView.vue                | 226       | Admin panel                                         |
| AccessManagementView.vue     | 222       | Access management functionality                     |
| VerifyEmailSuccessView.vue   | 219       | Email verification success                          |
| ResetPasswordView.vue        | 163       | Password reset request                              |
| VerifyEmailView.vue          | 123       | Email verification                                  |
| DesignView.vue               | 65        | Design documentation                                |
| CommunityView.vue            | 52        | Community page                                      |
| NotFoundView.vue             | 48        | 404 error page                                      |
| ReportsView.vue              | 47        | Reports page                                        |
| RestrictedAccessView.vue     | 30        | Restricted access message                           |

## Recipes Subdirectory (`src/views/recipes/`)

| File                      | Lines | Description                 |
| ------------------------- | ----- | --------------------------- |
| RecipeImportView.vue      | 1,022 | Recipe import functionality |
| RecipeManageView.vue      | 641   | Recipe management           |
| RecipeRecalculateView.vue | 397   | Recipe recalculation        |

## Enchantments Subdirectory (`src/views/enchantments/`)

| File                          | Lines | Description                    |
| ----------------------------- | ----- | ------------------------------ |
| MigrateBooksView.vue          | 580   | Enchantment book migration     |
| MigrateItemsView.vue          | 463   | Enchantable items migration     |
| ManageEnchantableItemsView.vue | 395  | Manage enchantable items       |

## Summary

-   **Total view files**: 41 files
-   **Largest file**: ShopItemsView.vue (1,997 lines)
-   **Average file size**: ~650 lines
-   **Files over 1,000 lines**: 8 files
-   **Files under 100 lines**: 5 files

## Notes

-   **ShopItemsView.vue** is the largest view file and may benefit from refactoring
-   **MarketOverviewView.vue** has grown to 1,598 lines and may also benefit from refactoring
-   Privacy policy and terms of use files are large due to content, not complexity
-   Most functional views (CRUD operations, management) range from 200-800 lines
-   Crate Rewards views (`CrateSingleView`, `CrateRewardManagerView`) and `YamlImportDevView` were removed in July 2026

_Last updated: July 2026_
