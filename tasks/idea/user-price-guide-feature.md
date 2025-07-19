# User Price Guide Feature - Spec & Tasks

## Overview

Allow users to create their own price guides based on the main item guide. Users can set custom prices for items, organize them by category, and optionally use dynamic pricing (recipe-based) for items, using only their own custom prices for ingredients. No custom items—only items from the main guide are allowed.

---

## 1. Data Model

### 1.1. User Price Guide

-   **Collection:** `user_price_guides`
-   **Fields:**
    -   `id`: string
    -   `user_id`: string (owner)
    -   `name`: string
    -   `description`: string
    -   `server_id`: string (optional, link to user's server)
    -   `minecraft_version`: string
    -   `use_main_categories`: boolean
    -   `is_public`: boolean
    -   `created_at`, `updated_at`: ISO string

### 1.2. User Price Guide Item

-   **Collection:** `user_price_guide_items`
-   **Fields:**
    -   `id`: string
    -   `guide_id`: string (parent guide)
    -   `main_item_id`: string (reference to main guide item)
    -   `price`: number (user's custom price)
    -   `pricing_type`: 'static' | 'dynamic'
    -   `category`: string (optional override)
    -   `subcategory`: string (optional override)
    -   `notes`: string
    -   `created_at`, `updated_at`: ISO string

---

## 2. UI/UX Requirements

### 2.1. Price Guide Management

-   List, create, edit, delete user price guides
-   Link to a server (optional)
-   Set Minecraft version
-   Choose to use main guide categories or custom categories
-   Set guide visibility (public/private)

### 2.2. Item Management

-   Add items from the main guide only
-   Set custom price and notes
-   Set pricing type: static or dynamic
-   If dynamic, show recipe and required ingredients
-   If dynamic, require all ingredients to exist in the user's guide (with custom prices)
-   UI helper: "Add all missing ingredients" to guide
-   Edit or remove items from guide

### 2.3. Dynamic Pricing & Recalculation

-   For dynamic items, recalculate price using the recipe from the main guide
-   Use only the user's custom prices for all ingredients
-   If any ingredient is missing, show error/warning and do not update price
-   Prevent circular dependencies
-   Show calculation breakdown (ingredient prices, quantities, total)
-   Button: "Recalculate Dynamic Prices" for the whole guide

### 2.4. Error Handling & Guidance

-   Warn user if trying to set dynamic pricing but not all ingredients are present
-   Option to bulk add missing ingredients
-   Show which items/ingredients are missing
-   Show which items failed to recalculate and why

---

## 3. Technical Tasks

### 3.1. Data Model & Utilities

-   [ ] Create Firestore collections: `user_price_guides`, `user_price_guide_items`
-   [ ] Utility functions for CRUD operations on guides and items
-   [ ] Utility for bulk importing items from main guide
-   [ ] Utility for checking missing ingredients for dynamic items
-   [ ] Utility for recalculating dynamic prices using only user guide prices
-   [ ] Circular dependency detection

### 3.2. UI Components & Views

-   [ ] UserPriceGuidesView.vue: List/create/edit/delete guides
-   [ ] UserPriceGuideItemsView.vue: Manage items in a guide
-   [ ] Add/Edit item modal: Set price, pricing type, notes, category
-   [ ] Dynamic pricing UI: Show recipe, ingredient status, calculation breakdown
-   [ ] Bulk import/add missing ingredients UI
-   [ ] Recalculation UI: Button, progress, error reporting

### 3.3. User Experience

-   [ ] Warnings and guidance for missing ingredients
-   [ ] Helper to add all missing ingredients
-   [ ] Clear error messages for recalculation failures
-   [ ] Show source of each ingredient price (user vs. missing)

### 3.4. Testing & Validation

-   [ ] Unit tests for utilities (CRUD, recalculation, ingredient checks)
-   [ ] Integration tests for UI flows
-   [ ] Manual QA: edge cases (circular, missing, bulk add, etc.)

---

## 4. Future Enhancements (Optional)

-   Public sharing of guides
-   Import/export guides
-   Compare user guide prices to main guide
-   Analytics on user pricing trends
