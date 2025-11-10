# User Suggestions & Feedback

## 2025-11-10 — Smart Number Formatting Toggle

-   **From:** noobieX4231
-   **Summary:** Add a settings checkbox to toggle smart number formatting (k/M/B suffixes) on or off.
-   **Details:** When disabled, the price guide UI and exports should show full numeric values so users can inspect precise price adjustments without abbreviations. The user often changes buy prices and wants to confirm exact numbers.
-   **Impacted Areas:** `SettingsModal` (new toggle), `HomeView` price tables, `ItemTable` display, `ExportModal` output formatting utilities.
-   **Estimated Effort:** Medium (1–2 days; coordination across pricing utilities, UI state, and export logic)
-   **Status:** 🆕 Logged

## 2025-11-10 — Patch-Level Version Pricing

-   **From:** noobieX4231
-   **Summary:** Allow selecting specific patch versions (e.g., `1.21.6`, `1.21.9`) instead of just major releases when browsing item prices.
-   **Details:** Provide per-item patch overrides where availability meaningfully changes, while defaulting to major-version pricing to keep the UI manageable. Ensure fallback logic cascades from patch to major versions and update admin tooling for storing patch-level adjustments.
-   **Impacted Areas:** version selector UI, pricing fetch logic, Firestore schema for price documents, admin import/seed scripts, roadmap documentation.
-   **Estimated Effort:** High (multi-phase; requires data modeling, UI changes, and tooling updates)
-   **Status:** 🆕 Logged

## 2025-11-10 — Dynamic Priced Items Markup

-   **From:** noobieX4231
-   **Summary:** Add a toggle in custom price guides to apply an extra markup percentage to dynamic priced items (craftable/smeltable recipes).
-   **Details:** Let players adjust markup (e.g., +5–10%) to compensate for crafting time, resource preparation, and fuel cost while leaving baseline recipe pricing intact. The toggle should only affect the user's custom guide and not alter the public price guide defaults.
-   **Impacted Areas:** custom guide settings UI, price calculation utilities, user-specific persistence for custom guide preferences.
-   **Dependencies:** completion of the custom price guide feature.
-   **Estimated Effort:** Medium (UI control, state wiring, price math adjustments)
-   **Status:** 🆕 Logged
