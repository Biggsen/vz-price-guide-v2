# 📤 Price Export Feature Enhancements

## 📌 Overview

The Price Export feature has been **partially implemented** with a working ExportModal component that supports JSON and basic YAML export. This document outlines the remaining enhancements needed to complete the full specification.

**Status**: 🟡 **NOT READY** - Valid direction, needs decisions before implementation

---

## ✅ **Already Implemented**

### Core Functionality (ExportModal.vue)

-   ✅ **Authentication Gating** - Only verified accounts can export
-   ✅ **Version Selection** - Choose Minecraft version (1.16-1.21)
-   ✅ **Category Filtering** - Multi-select categories (empty selection includes all)
-   ✅ **Price Field Selection** - Choose unit_buy, unit_sell, stack_buy, stack_sell
-   ✅ **Metadata Inclusion** - Optional name, category, stack size
-   ✅ **JSON Export** - Full JSON export with proper formatting
-   ✅ **YAML Export** - Working YAML export (uses custom generation)
-   ✅ **Preview Functionality** - Shows first 3 items before export
-   ✅ **File Naming** - Proper timestamp-based naming
-   ✅ **Integration** - Used in HomeView with export button
-   ✅ **Sorting + Rounding Parity** - Matches main UI (default order, name/buy sorting, round-to-whole)

### Data Processing

-   ✅ **Version Filtering** - Proper version comparison logic
-   ✅ **Price Calculation** - Uses existing pricing utilities
-   ✅ **Material ID Keying** - JSON/YAML keyed by material_id
-   ✅ **Export Metadata** - JSON includes export metadata block

---

## 🔄 **Missing Enhancements**

### 1. **CSV/XLSX Export Support**

**Current State**: Only JSON and YAML implemented  
**Missing**: CSV and XLSX export functionality

**Open Questions (must decide first)**:

-   How should CSV/XLSX handle **diamond currency** exports (ratio objects)?
    -   Option A: split into columns (e.g., `buy_diamonds`, `buy_quantity`)
    -   Option B: stringify the ratio as a single cell
    -   Option C: disable CSV/XLSX for diamond currency mode
-   Should `_export_metadata` be exported in CSV/XLSX (separate sheet / header block / omitted)?

**Implementation Tasks**:

-   [ ] Add `xlsx` (SheetJS) dependency to package.json
-   [ ] Implement `exportCSV()` function in ExportModal.vue
-   [ ] Implement `exportXLSX()` function in ExportModal.vue
-   [ ] Add CSV/XLSX export buttons to modal footer
-   [ ] Handle column selection for spreadsheet formats
-   [ ] Ensure correct CSV quoting + spreadsheet-safe escaping

---

### 2. **Proper YAML Library Integration**

**Current State**: Custom YAML generation - **working but improvable**  
**Missing**: Proper YAML library integration for better formatting and edge case handling

**Open Questions (must decide first)**:

-   Should YAML include the same `_export_metadata` block as JSON (parity) or omit it intentionally?

**Implementation Tasks**:

-   [ ] Add `js-yaml` dependency to package.json
-   [ ] Replace custom `generateYAML()` with js-yaml library
-   [ ] Decide metadata parity behavior and document it

---

### 3. **Stack Size Override Option**

**Current State**: Uses item’s natural stack size  
**Missing**: Option to override all stack sizes (e.g., force all to 64)

**Implementation Tasks**:

-   [ ] Add stack size override input to Advanced Options
-   [ ] Update price calculation to use override when specified
-   [ ] Validation for stack override values (1-64)
-   [ ] Clarify whether exported metadata `stack` reflects override or item natural stack

---

### 4. **Currency Format Toggle**

**Current State**: Always exports raw numbers (money currency) / ratio objects (diamond currency)  
**Missing**: Option for formatted vs raw currency values

**Open Questions (must decide first)**:

-   JSON/YAML: should “formatted” mean strings (e.g., `$12`, `12.0`, `12 diamonds`)?
-   CSV/XLSX: should formatted values be strings or numeric cells?

---

### 5. **Dedicated Export Route**

**Current State**: Only available via modal from HomeView  
**Missing**: Dedicated `/export` route for direct access

**Implementation Tasks**:

-   [ ] Create `ExportView.vue` component (or reuse modal content in a view)
-   [ ] Add `/export` route to router
-   [ ] Add navigation link to main nav
-   [ ] Ensure proper authentication gating

---

### 6. **Rate Limiting & Security**

**Current State**: No rate limiting implemented  
**Missing**: Rate limiting and export logging

**Implementation Tasks**:

-   [ ] Implement client-side throttling (UX-only)
-   [ ] Add export logging to Firestore (audit trail)
-   [ ] Track export events for analytics
-   [ ] Add user feedback for rate limit exceeded

---

### 7. **Cloud Function Support (Optional)**

**Current State**: Client-side only  
**Missing**: Server-side export for large datasets / governance

**Implementation Tasks**:

-   [ ] Create Cloud Function for large exports
-   [ ] Implement server-side rate limiting + validation
-   [ ] Add progress indicators for large exports
-   [ ] Fallback to client-side for smaller exports

---

### 8. **Economy Plugin Shop Format Exports (e.g., EconomyShopGUI)**

**Current State**: Not implemented  
**Status**: 🟡 **NOT READY** - needs research + format decisions first

**Goal**: Export the price guide into known economy plugin shop/config formats (starting with EconomyShopGUI), so server owners can drop the file into their plugin setup with minimal manual editing.

**Why it’s not ready**:

-   Plugin formats vary wildly (YAML shapes, item identifiers, category/shop structure, localization, optional fields)
-   Need a clear target: EconomyShopGUI version(s), supported features, and “minimal viable” output
-   Needs mapping rules from your domain model (items/categories/prices) to plugin constructs (shops, sections, buy/sell actions, stock, permissions)

**Discovery Tasks**:

-   [ ] Collect sample configs for the target plugin(s) + version(s)
-   [ ] Define a normalized “intermediate export model” for shops/categories/items
-   [ ] Decide which pricing fields map to plugin “buy/sell” (and what to do when only one exists)
-   [ ] Define file naming + output structure (single file vs per-category/per-shop files)
-   [ ] Confirm whether diamond currency mode should be supported for plugin exports

---

## 📋 **Implementation Priority (once READY)**

### **Phase 1: Core Enhancements (High Priority)**

1. **CSV/XLSX Export**
2. **Proper YAML Library**
3. **Stack Size Override**

### **Phase 2: UX Improvements (Medium Priority)**

4. **Dedicated Export Route**
5. **Currency Format Toggle**

### **Phase 3: Security & Scale (Low Priority)**

6. **Rate Limiting + Logging**
7. **Cloud Function Support**

### **Phase 4: Plugin Ecosystem (Research First)**

8. **Economy Plugin Shop Format Exports (EconomyShopGUI, etc.)**

