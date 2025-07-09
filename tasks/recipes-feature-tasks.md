# ✅ Minecraft Price Guide: Recipe Management Tasks

## 🗂️ Data Processing & Parsing

-   [ ] Create recipe parsing utility to convert JSON recipes to internal format
-   [ ] Parse `items_1_16.json` into `idToMaterialId` map
-   [ ] Parse `recipes_1_16.json` shaped recipes (`inShape`) and shapeless recipes (`ingredients`)
-   [ ] Transform into internal `{ material_id, quantity }[]` format
-   [ ] Validate ingredients exist in items database
-   [ ] Handle default values for tags (e.g., `#planks` → `oak_planks`)
-   [ ] Detect and handle missing/invalid materials

## 🖥 Admin Recipe Management Page

-   [ ] Create RecipeManagementView.vue based on existing admin patterns
-   [ ] Recipe import section with individual recipe preview
-   [ ] Recipe validation display (valid/warning/error states)
-   [ ] Import/Skip buttons for individual recipes
-   [ ] Progress tracking for recipe import process
-   [ ] Recipe management section for viewing existing recipes
-   [ ] Search/filter functionality for recipes
-   [ ] Individual recipe editing interface
-   [ ] Recipe deletion with confirmation
-   [ ] Manual recipe creation form

## 🧠 Core Recipe Features

-   [ ] Store `recipes_by_version` per item in Firestore
-   [ ] Enable fallback inheritance for missing versions
-   [ ] Build reverse index for efficient recalculation
-   [ ] Implement manual recalculation command/tool
-   [ ] Recipe duplication detection
-   [ ] Recipe inheritance display (show inherited vs. version-specific)

## 🔍 Recipe Validation & Quality Control

-   [ ] Real-time ingredient validation
-   [ ] Missing material suggestions
-   [ ] Circular dependency detection
-   [ ] Price impact preview for recipe changes
-   [ ] Duplicate recipe warnings
-   [ ] Recipe audit trail tracking

## 🎯 UI Components

-   [ ] Recipe card component for preview
-   [ ] Ingredient table component
-   [ ] Recipe validation status indicators
-   [ ] Version selector component
-   [ ] Batch action controls
-   [ ] Recipe search and filter controls

## 🔧 Integration & Testing

-   [ ] Add recipe management route to router
-   [ ] Integrate with existing admin authentication
-   [ ] Unit test: recipe parsing and validation
-   [ ] Unit test: ingredient lookup and suggestions
-   [ ] Integration test: recipe import workflow
-   [ ] Integration test: recipe editing and deletion
-   [ ] Test recipe inheritance and fallback logic

## 📱 User Experience

-   [ ] Import success/failure feedback
-   [ ] Loading states for async operations
-   [ ] Error handling and user-friendly messages
-   [ ] Keyboard shortcuts for common actions
-   [ ] Responsive design for mobile/tablet use
