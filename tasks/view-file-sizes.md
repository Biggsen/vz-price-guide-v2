# View File Sizes

This document contains the line count data for all Vue view files in the project as of the current analysis.

## Main Views Directory (`src/views/`)

| File                         | Lines     | Description                                         |
| ---------------------------- | --------- | --------------------------------------------------- |
| **CrateSingleView.vue**      | **2,578** | **Largest view file - Complex crate functionality** |
| PrivacyPolicyView.vue        | 1,867     | Privacy policy content                              |
| BulkUpdateItemsView.vue      | 1,173     | Bulk item update functionality                      |
| TermsOfUseView.vue           | 1,266     | Terms of use content                                |
| StyleguideView.vue           | 1,240     | Style guide documentation                           |
| YamlImportDevView.vue        | 968       | YAML import development tools                       |
| CrateRewardManagerView.vue   | 900       | Crate reward management                             |
| HomeView.vue                 | 810       | Homepage view                                       |
| EditItemView.vue             | 634       | Item editing functionality                          |
| VisualGalleryView.vue        | 644       | Visual gallery display                              |
| ShopItemsView.vue            | 571       | Shop items management                               |
| AddItemView.vue              | 553       | Add new item functionality                          |
| EditRecipeView.vue           | 552       | Recipe editing                                      |
| MarketOverviewView.vue       | 596       | Market overview display                             |
| CookiePolicyView.vue         | 443       | Cookie policy content                               |
| ShopsView.vue                | 419       | Shops listing                                       |
| AccountView.vue              | 421       | User account management                             |
| MissingItemsView.vue         | 373       | Missing items display                               |
| SignUpView.vue               | 346       | User registration                                   |
| UpdatesView.vue              | 346       | Updates display                                     |
| ChangePasswordView.vue       | 341       | Password change functionality                       |
| ToolsView.vue                | 327       | Tools page                                          |
| ResetPasswordConfirmView.vue | 312       | Password reset confirmation                         |
| ServersView.vue              | 274       | Servers listing                                     |
| SuggestionsView.vue          | 274       | Suggestions display                                 |
| SignInView.vue               | 236       | User login                                          |
| SuggestionsAdminView.vue     | 217       | Admin suggestions management                        |
| ShopManagerView.vue          | 205       | Shop management                                     |
| VerifyEmailSuccessView.vue   | 178       | Email verification success                          |
| PrivacyPolicyHeader.vue      | -         | Privacy policy header component                     |
| ResetPasswordView.vue        | 160       | Password reset request                              |
| VerifyEmailView.vue          | 119       | Email verification                                  |
| AdminView.vue                | 133       | Admin panel                                         |
| DesignView.vue               | 59        | Design documentation                                |
| RestrictedAccessView.vue     | 27        | Restricted access message                           |
| NotFoundView.vue             | 42        | 404 error page                                      |

## Recipes Subdirectory (`src/views/recipes/`)

| File                      | Lines | Description                 |
| ------------------------- | ----- | --------------------------- |
| RecipeImportView.vue      | 714   | Recipe import functionality |
| RecipeManageView.vue      | 406   | Recipe management           |
| RecipeRecalculateView.vue | 367   | Recipe recalculation        |

## Summary

-   **Total view files**: 38 files
-   **Largest file**: CrateSingleView.vue (2,578 lines)
-   **Average file size**: ~500 lines
-   **Files over 1,000 lines**: 5 files
-   **Files under 100 lines**: 3 files

## Notes

-   The CrateSingleView.vue file is significantly larger than others, suggesting it may benefit from refactoring into smaller components
-   Privacy policy and terms of use files are large due to content, not complexity
-   Most functional views (CRUD operations, management) range from 200-800 lines
-   The recipes subdirectory contains moderately complex views for recipe management

_Generated on: December 19, 2024_
