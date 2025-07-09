# ✅ Minecraft Price Guide: Task List

## 🗂️ Data Processing
- [ ] Parse `items_1_16.json` into `idToMaterialId` map
- [ ] Parse `recipes_1_16.json` and flatten `inShape`
- [ ] Transform into internal `{ material_id, quantity }[]` format
- [ ] Skip invalid or unmapped IDs
- [ ] Handle default values for tags (e.g., `#planks` → `oak_planks`)

## 🧠 Core Features
- [ ] Build recipe importer script
- [ ] Store `recipes_by_version` per item
- [ ] Enable fallback inheritance for missing versions
- [ ] Build reverse index for efficient recalculation
- [ ] Implement manual recalculation command/tool

## 🖥 UI: Import Page
- [ ] File upload interface for `items` and `recipes`
- [ ] Dropdown to select version (e.g., 1.16)
- [ ] Recipe preview table (output item + ingredients)
- [ ] “Import Recipes” button
- [ ] Import success/failure feedback

## ⚠ Validation & Error Handling
- [ ] Log skipped recipes with reasons
- [ ] Warn if recipes reference unknown items
- [ ] Detect and prevent circular dependencies

## 🧪 Testing
- [ ] Unit test: recipe flattening and conversion
- [ ] Unit test: fallback resolution logic
- [ ] Unit test: price recalculation logic
- [ ] Integration test: full import and update workflow