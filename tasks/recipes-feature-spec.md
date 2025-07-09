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

- **All prices are cached** in `prices_by_version`
- `static`: fixed and manually edited
- `dynamic`: calculated from recipes, but not auto-updated
- Manual admin actions trigger recalculation for a version
- If a recipe is missing for a version, fallback to the latest earlier version

---

## 3. 🔁 Reverse Index

- Maps materials to the items that use them per version
- Used for efficient recalculation of affected items when a base price changes

```ts
reverseIndex: {
  "iron_ingot": {
    "1.16": ["iron_pickaxe", "anvil"],
    "1.18": ["iron_pickaxe", "minecart"]
  }
}
```

---

## 4. 🔄 Import Recipes Page

### Purpose
Transform `recipes_1_16.json` and `items_1_16.json` into internal recipe format.

### Input Format
- `recipes_1_16.json`: shaped recipes using numeric item IDs
- `items_1_16.json`: maps item ID → material ID

### Transform Steps
1. Load ID-to-material map from `items.json`
2. For each recipe:
   - Use `inShape` to extract ingredients
   - Flatten into `{ material_id, quantity }[]`
   - Skip invalid or unmapped IDs
3. Save result into `recipes_by_version["1.16"]`

### UI Features
- Upload JSON files
- Select version
- Preview table of recipes: output item + ingredients
- “Import” button to apply recipes

---

## 5. 🧠 Recipe Inheritance

- Only define a recipe for the version where it changes
- Use the nearest earlier version for fallback during price calculations

---

## 6. 🧪 Validation Rules

| Condition | Handling |
|----------|----------|
| ID not found | Skip and log warning |
| Null/empty shape cell | Skip |
| Invalid recipe data | Skip recipe |
| Duplicate recipe | Use the first valid one |
| Tag-based input | Replace with default representative (e.g., `oak_planks`) |

---

## ✅ Summary

- Fully versioned item system
- Dynamic prices are opt-in and manually recalculated
- Recipes are imported, not crowdsourced
- Simple, normalized internal recipe format
- Efficient updates using reverse index