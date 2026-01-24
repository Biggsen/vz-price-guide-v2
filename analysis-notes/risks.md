Based on repo-map.md, here are the top 10 technical risks and tech-debt areas:


1. Firebase Admin SDK Initialisation Duplication

Risk: Multiple files contain nearly identical Firebase Admin initialisation logic with hardcoded fallbacks Why it matters: Code
duplication increases maintenance burden and creates inconsistency risks across environments Where it lives: cypress.config.js,
scripts/cleanOrphanedShopData.js, scripts/reports/crateRewardReport.js, scripts/reports/findServersWithoutShops.js,
scripts/reports/serverShopReport.js, scripts/seed-emulator.js


2. Image Download Function Inconsistencies

Risk: Similar image downloading functions with subtle differences in error handling and response processing Why it matters: Inconsistent
error handling could lead to silent failures or different behaviours across image processing workflows Where it lives:
scripts/downloadArmorImages.js, scripts/downloadEnchantedArmorImages.js, scripts/downloadEnchantedImages.js


3. Pricing Logic Complexity and Duplication

Risk: Complex pricing calculation logic exists in multiple locations with potential inconsistencies Why it matters: Pricing is core
business logic; inconsistencies could lead to incorrect price displays or calculations Where it lives:
scripts/auditPriceFieldMigration.js, src/utils/pricing.js


4. Hardcoded Project ID Fallbacks

Risk: Multiple hardcoded fallback project IDs (demo-vz-price-guide) scattered throughout the codebase Why it matters: Creates tight
coupling to specific environments and makes configuration management fragile Where it lives: cypress.config.js,
scripts/cleanOrphanedShopData.js, scripts/reports/, scripts/seed-emulator.js


5. Array Chunking Logic Duplication

Risk: Identical chunkArray helper functions duplicated across multiple files Why it matters: Code duplication increases maintenance
overhead and potential for bugs when logic needs updating Where it lives: src/utils/shopItems.js (multiple instances within the same file)


6. Directory Creation Utility Duplication

Risk: ensureDirectoryExists function duplicated across multiple scripts Why it matters: Inconsistent directory handling could lead to
filesystem errors in different environments Where it lives: scripts/downloadArmorImages.js, scripts/downloadEnchantedArmorImages.js,
scripts/downloadEnchantedImages.js, scripts/run-visual-tests.js


7. Material ID Capitalisation Logic Duplication

Risk: Identical capitalizeMaterialId functions repeated across image processing scripts Why it matters: String processing inconsistencies
could lead to asset loading failures or naming conflicts Where it lives: scripts/downloadArmorImages.js,
scripts/downloadEnchantedArmorImages.js, scripts/downloadEnchantedImages.js


8. Complex Search and Filter State Management

Risk: Intricate state management logic in composables with potential for race conditions or state inconsistencies Why it matters: Search
functionality is critical for user experience; bugs could make the application unusable Where it lives:
src/composables/useCategorizedItemSearch.js, src/composables/useEnchantmentSearch.js, src/composables/useFilters.js


9. Visual Testing Screenshot Management Complexity

Risk: Complex screenshot organisation and file management logic that could be brittle Why it matters: Visual regression testing is
critical for UI quality; failures could allow visual bugs into production Where it lives: scripts/run-visual-tests.js,
cypress/e2e/visual-regression.cy.js


10. Environment-Specific Configuration Scattered

Risk: Environment detection and configuration logic spread across multiple files without centralisation Why it matters: Inconsistent
environment handling could lead to production/development configuration leaks or failures Where it lives: src/utils/image.js,
src/utils/analytics.js, various scripts with emulator detection logic


Additional Concerns:

Authentication and Admin Logic Fragmentation Risk: Admin authentication checks and user profile logic distributed across multiple
utilities Why it matters: Security-critical code should be centralised and thoroughly tested Where it lives: src/constants.js,
src/utils/accessManagement.js, src/utils/userProfile.js

These risks primarily stem from code duplication, lack of centralised configuration management, and complex state management patterns that
could benefit from refactoring and consolidation.