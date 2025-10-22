# 📤 Price Export Feature Enhancements

## 📌 Overview

The Price Export feature has been **partially implemented** with a working ExportModal component that supports JSON and basic YAML export. This document outlines the remaining enhancements needed to complete the full specification.

**Status**: 🔄 **ENHANCEMENT** - Core functionality implemented, enhancements needed

---

## ✅ **Already Implemented**

### Core Functionality (ExportModal.vue)

-   ✅ **Authentication Gating** - Only logged-in users can export
-   ✅ **Version Selection** - Choose Minecraft version (1.16-1.21)
-   ✅ **Category Filtering** - Multi-select categories with "all" option
-   ✅ **Price Field Selection** - Choose unit_buy, unit_sell, stack_buy, stack_sell
-   ✅ **Metadata Inclusion** - Optional name, category, stack size
-   ✅ **JSON Export** - Full JSON export with proper formatting
-   ✅ **YAML Export** - Working YAML export (uses custom generation)
-   ✅ **Preview Functionality** - Shows first 3 items before export
-   ✅ **File Naming** - Proper timestamp-based naming
-   ✅ **Integration** - Used in HomeView with export button

### Data Processing

-   ✅ **Version Filtering** - Proper version comparison logic
-   ✅ **Price Calculation** - Uses existing pricing utilities
-   ✅ **Material ID Keying** - JSON/YAML keyed by material_id
-   ✅ **Export Metadata** - Includes source, version, date, item count

---

## 🔄 **Missing Enhancements**

### 1. **CSV/XLSX Export Support**

**Current State**: Only JSON and YAML implemented
**Missing**: CSV and XLSX export functionality

**Implementation Tasks**:

-   [ ] Add `xlsx` (SheetJS) dependency to package.json
-   [ ] Implement `exportCSV()` function in ExportModal.vue
-   [ ] Implement `exportXLSX()` function in ExportModal.vue
-   [ ] Add CSV/XLSX export buttons to modal footer
-   [ ] Handle column selection for spreadsheet formats
-   [ ] Create proper CSV generation with configurable columns

**Code Changes**:

```javascript
// Add to ExportModal.vue
function exportCSV() {
	const csvContent = generateCSV(exportData.value)
	downloadFile(csvContent, 'csv', 'text/csv')
}

function exportXLSX() {
	const workbook = generateXLSX(exportData.value)
	const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
	const blob = new Blob([excelBuffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	})
	downloadFile(blob, 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
```

### 2. **Proper YAML Library Integration**

**Current State**: Custom YAML generation (lines 211-221) - **Working but improvable**
**Missing**: Proper js-yaml library integration for better formatting and edge case handling

**Implementation Tasks**:

-   [ ] Add `js-yaml` dependency to package.json
-   [ ] Replace custom `generateYAML()` with js-yaml library
-   [ ] Improve YAML formatting and structure
-   [ ] Handle special characters and edge cases properly

**Code Changes**:

```javascript
// Replace custom YAML generation
import * as yaml from 'js-yaml'

function exportYAML() {
	const yamlStr = yaml.dump(exportData.value, {
		indent: 2,
		lineWidth: -1,
		noRefs: true
	})
	downloadFile(yamlStr, 'yml', 'text/yaml')
}
```

### 3. **Stack Size Override Option**

**Current State**: Uses item's natural stack size
**Missing**: Option to override all stack sizes (e.g., force all to 64)

**Implementation Tasks**:

-   [ ] Add stack size override input to Advanced Options
-   [ ] Update price calculation to use override when specified
-   [ ] Add validation for stack size override values

**UI Addition**:

```html
<!-- Add to Advanced Options section -->
<div class="flex items-center space-x-2">
	<input type="checkbox" v-model="useStackOverride" class="checkbox-input" />
	<span class="text-sm">Override stack size</span>
</div>
<div v-if="useStackOverride" class="ml-6">
	<input
		v-model.number="stackOverrideValue"
		type="number"
		min="1"
		max="64"
		class="w-20 border rounded px-2 py-1" />
	<span class="text-sm text-gray-600 ml-2">items per stack</span>
</div>
```

### 4. **Currency Format Toggle**

**Current State**: Always exports raw numbers
**Missing**: Option for formatted vs raw currency values

**Implementation Tasks**:

-   [ ] Add currency format toggle to Advanced Options
-   [ ] Implement formatted currency generation
-   [ ] Update export functions to handle both formats

### 5. **Dedicated Export Route**

**Current State**: Only available via modal from HomeView
**Missing**: Dedicated `/export` route for direct access

**Implementation Tasks**:

-   [ ] Create `ExportView.vue` component
-   [ ] Add `/export` route to router
-   [ ] Add navigation link to main nav
-   [ ] Ensure proper authentication gating

### 6. **Rate Limiting & Security**

**Current State**: No rate limiting implemented
**Missing**: Rate limiting and export logging

**Implementation Tasks**:

-   [ ] Implement client-side rate limiting (e.g., 1 export per minute)
-   [ ] Add export logging to Firestore
-   [ ] Track export events for analytics
-   [ ] Add user feedback for rate limit exceeded

### 7. **Cloud Function Support (Optional)**

**Current State**: Client-side only
**Missing**: Server-side export for large datasets

**Implementation Tasks**:

-   [ ] Create Cloud Function for large exports
-   [ ] Implement server-side rate limiting
-   [ ] Add progress indicators for large exports
-   [ ] Fallback to client-side for smaller exports

---

## 📋 **Implementation Priority**

### **Phase 1: Core Enhancements (High Priority)**

1. **CSV/XLSX Export** - Most requested feature
2. **Proper YAML Library** - Improve existing functionality
3. **Stack Size Override** - Useful for plugin integration

### **Phase 2: UX Improvements (Medium Priority)**

4. **Dedicated Export Route** - Better discoverability
5. **Currency Format Toggle** - Enhanced flexibility

### **Phase 3: Security & Scale (Low Priority)**

6. **Rate Limiting** - Prevent abuse
7. **Cloud Function Support** - Handle large datasets

---

## 🧪 **Testing Requirements**

### **New Functionality Testing**

-   [ ] CSV export opens correctly in Excel/Google Sheets
-   [ ] XLSX export contains proper worksheet structure
-   [ ] YAML export uses proper js-yaml formatting
-   [ ] Stack size override affects all calculations correctly
-   [ ] Currency format toggle produces expected output

### **Integration Testing**

-   [ ] Export route works independently of HomeView
-   [ ] Rate limiting prevents excessive exports
-   [ ] Export logging captures all necessary data
-   [ ] Large dataset exports work via Cloud Function

### **Edge Case Testing**

-   [ ] Special characters in item names export correctly
-   [ ] Very large exports (>1000 items) complete successfully
-   [ ] Empty category selections export all items
-   [ ] Invalid stack size overrides are handled gracefully

---

## 📈 **Success Metrics**

-   [ ] **Feature Completeness**: All 4 export formats (JSON, YAML, CSV, XLSX) working
-   [ ] **User Adoption**: Increased export usage after enhancements
-   [ ] **Performance**: Large exports complete within 30 seconds
-   [ ] **Reliability**: 99%+ successful export completion rate
-   [ ] **User Satisfaction**: Positive feedback on export functionality

---

## 🔧 **Dependencies**

### **New Dependencies Required**

```json
{
	"js-yaml": "^4.1.0",
	"xlsx": "^0.18.5"
}
```

### **Existing Dependencies Used**

-   Vue 3 Composition API
-   VueFire for Firestore integration
-   Existing pricing utilities
-   Tailwind CSS for styling
-   Heroicons for icons

---

## 📝 **Notes**

-   The current implementation is solid and functional for basic needs
-   Most enhancements are additive and won't break existing functionality
-   CSV/XLSX support is the highest priority based on user requests
-   Proper YAML library will improve export quality significantly
-   Rate limiting should be implemented before promoting the feature widely

---

**Estimated Effort**: 2-3 weeks for all enhancements
**Dependencies**: None - can be implemented incrementally
**Risk Level**: Low - mostly additive changes to existing working code
