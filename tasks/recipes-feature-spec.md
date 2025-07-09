# 🧾 Minecraft Price Guide: Specification

## 📌 Overview

This system supports a version-aware, partially dynamic price guide for Minecraft items. Each item can have manually set prices (static) or calculated prices based on crafting recipes (dynamic). Recipes and prices can vary between versions, but most will inherit from earlier versions unless overridden. Base prices are curated and rarely change; derived prices are only recalculated when manually triggered.

---

## 1. 🧱 Item Data Structure

```ts
Item {
  name: string;
  material_id: string;
  image: string;
  url?: string;
  stack: number;
  category: string;
  subcategory?: string;
  version: string;
  version_removed: string | null;
  pricing_type: 'static' | 'dynamic';
  prices_by_version: {
    [version: string]: number;
  };
  recipes_by_version?: {
    [version: string]: Recipe[];
  };
}

Recipe {
  material_id: string;
  quantity: number;
}
```

---

## 2. 💰 Pricing System

-   **All prices are cached** in `prices_by_version`
-   `static`: fixed and manually edited
-   `dynamic`: calculated from recipes, but not auto-updated
-   Manual admin actions trigger recalculation for a version
-   If a recipe is missing for a version, fallback to the latest earlier version

---

## 3. 🔁 Reverse Index

-   Maps materials to the items that use them per version
-   Used for efficient recalculation of affected items when a base price changes

```ts
reverseIndex: {
  "iron_ingot": {
    "1.16": ["iron_pickaxe", "anvil"],
    "1.18": ["iron_pickaxe", "minecart"]
  }
}
```

---

## 4. 🔄 Recipe Management Page

### Purpose

Admin interface for importing, verifying, and managing recipes one at a time for quality control.

### Input Format

-   `recipes_1_16.json`: shaped recipes using numeric item IDs
-   `items_1_16.json`: maps item ID → material ID

### Core Features

#### 📥 Recipe Import Section

-   Load recipes from JSON files one by one (not bulk)
-   Preview individual recipe with validation
-   Show output item + ingredients in table format
-   Validate all ingredients exist in items database
-   **Import Recipe** or **Skip Recipe** buttons per recipe
-   Progress tracking (e.g., "Recipe 45 of 2,341")

#### 📋 Recipe Management Section

-   View all existing recipes for selected version
-   Search/filter by output item or ingredient name
-   Edit individual recipes inline
-   Delete recipes with confirmation
-   Add new recipes manually
-   Copy recipes between versions

#### ✅ Recipe Verification Features

-   **Valid**: All ingredients exist in items database
-   **Warning**: Missing materials with suggestions
-   **Inheritance**: Show recipe inheritance from previous versions
-   **Price Impact**: Preview price changes when recipe is applied
-   **Duplicate Detection**: Warn about existing recipes for same item

### Transform Steps

1. Parse individual recipe from JSON
2. Load ID-to-material map from `items_1_16.json`
3. For each recipe:
    - Use `inShape` to extract ingredients (shaped recipes)
    - Use `ingredients` array (shapeless recipes)
    - Flatten into `{ material_id, quantity }[]`
    - Validate all materials exist in database
    - Show warnings for missing materials
4. Admin decides: Import or Skip
5. Save to `recipes_by_version["1.16"]` if imported

### UI Components

-   **Recipe Card**: Shows output item, ingredients, validation status
-   **Ingredient Table**: Material name, quantity, validation status
-   **Search Bar**: Filter recipes by item name or ingredient
-   **Version Selector**: Switch between Minecraft versions
-   **Batch Actions**: Import multiple verified recipes at once

---

## 5. 🧠 Recipe Inheritance

-   Only define a recipe for the version where it changes
-   Use the nearest earlier version for fallback during price calculations
-   Recipe management page shows inherited recipes in different color/style
-   Can override inherited recipes by creating version-specific recipe

---

## 6. 🧪 Validation Rules

| Condition             | Handling                                                 |
| --------------------- | -------------------------------------------------------- |
| ID not found          | Show as warning, suggest similar materials               |
| Null/empty shape cell | Skip cell, continue processing                           |
| Invalid recipe data   | Show error, allow manual correction                      |
| Duplicate recipe      | Warn admin, allow override or skip                       |
| Tag-based input       | Replace with default representative (e.g., `oak_planks`) |
| Missing ingredients   | Show warning, allow manual ingredient selection          |
| Circular dependencies | Detect and warn during price calculation                 |

---

## 7. 🎯 Recipe Quality Control

### Import Flow

1. **Parse Recipe**: Extract from JSON with validation
2. **Preview**: Show formatted recipe with ingredient details
3. **Validate**: Check all materials exist and are valid
4. **Admin Decision**: Import, Skip, or Edit before importing
5. **Save**: Store in Firestore with version tracking

### Editing Flow

1. **Load Recipe**: Display current recipe data
2. **Edit Ingredients**: Add/remove/modify ingredients
3. **Real-time Validation**: Check changes as they're made
4. **Price Preview**: Show impact on calculated prices
5. **Save Changes**: Update in database with audit trail

---

## ✅ Summary

-   Individual recipe verification for quality control
-   Admin-controlled import process with validation
-   Recipe inheritance system for version management
-   Real-time validation and price impact preview
-   Comprehensive recipe management interface
-   Audit trail for all recipe changes
