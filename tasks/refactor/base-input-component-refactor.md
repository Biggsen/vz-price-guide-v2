# Base Input Component Refactor

## Overview

Create a reusable `BaseInput` component to standardize form inputs across the application and refactor all existing form inputs to use it. This will improve consistency, maintainability, and reduce code duplication.

## Goals

1. **Consistency**: Standardize input styling and behavior across all forms
2. **Maintainability**: Centralize input logic and styling in one component
3. **Accessibility**: Ensure all inputs have proper labels, ARIA attributes, and keyboard navigation
4. **Developer Experience**: Simplify form creation with a unified API
5. **Code Reduction**: Eliminate repetitive input styling classes throughout the codebase

## Current State Analysis

### Input Types Currently Used

1. **Text Inputs** - Used in:
   - `ShopItemForm.vue` - Item search, notes
   - `AccountView.vue` - Minecraft username, display name
   - `SignInView.vue` - Email, password
   - `SignUpView.vue` - Email, password, display name
   - Various other forms

2. **Number Inputs** - Used in:
   - `ShopItemForm.vue` - Buy price, sell price, stock quantity
   - `InlinePriceInput.vue` - Price editing
   - `CrateSingleView.vue` - Various price inputs
   - `EditItemView.vue` - Price inputs

3. **Textarea** - Used in:
   - `ShopItemForm.vue` - Notes field
   - `AdminSuggestionMessageForm.vue` - Message text
   - `SuggestionMessageForm.vue` - Message text
   - `AccountView.vue` - Bio field
   - Various other forms

4. **Select Dropdowns** - Used in:
   - `ShopItemForm.vue` - (Potential for version selection)
   - Various server/shop selection dropdowns

5. **Checkboxes** - Used in:
   - `ShopItemForm.vue` - Stock full checkbox
   - `AccountView.vue` - Use Minecraft username checkbox
   - Various other forms

### Common Styling Patterns

All inputs currently share these Tailwind classes:
- `border-2 border-gray-asparagus`
- `rounded`
- `px-3 py-1` (or `py-2` for textareas)
- `text-gray-900`
- `placeholder:text-gray-400`
- `focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus`
- `font-sans`

### Current Issues

1. **Inconsistent Styling**: Slight variations in padding, width, and spacing
2. **Repetitive Code**: Same classes repeated across many components
3. **No Error State**: Error styling is handled inconsistently
4. **Missing Accessibility**: Not all inputs have proper labels and ARIA attributes
5. **No Validation Feedback**: Visual feedback for validation errors is inconsistent

## BaseInput Component Specification

### Component Name

`BaseInput.vue` - Located in `src/components/BaseInput.vue`

### Props

```typescript
{
  // Core props
  modelValue: [String, Number, Boolean], // v-model value
  type: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'number', 'email', 'password', 'tel', 'url', 'textarea', 'select', 'checkbox'].includes(value)
  },
  
  // Label and identification
  label: String,
  id: String, // Auto-generated if not provided
  name: String,
  placeholder: String,
  
  // Styling
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  width: {
    type: String,
    default: 'full', // 'full', 'auto', or specific width class
    validator: (value) => ['full', 'auto', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].includes(value)
  },
  
  // States
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  error: String, // Error message to display
  hint: String, // Helper text below input
  
  // Input-specific props
  min: [Number, String],
  max: [Number, String],
  step: [Number, String],
  minLength: Number,
  maxLength: Number,
  rows: Number, // For textarea
  autocomplete: String,
  
  // Select-specific props
  options: Array, // [{ value: '', label: '' }] for select type
  
  // Checkbox-specific props
  checked: Boolean, // For checkbox type
  
  // Validation
  validationState: {
    type: String,
    validator: (value) => !value || ['error', 'success'].includes(value)
  }
}
```

### Events

```typescript
{
  'update:modelValue': (value) => void,
  'blur': (event) => void,
  'focus': (event) => void,
  'input': (event) => void,
  'change': (event) => void
}
```

### Slots

```vue
<template>
  <!-- Default slot for custom content (e.g., icons, buttons inside input) -->
  <slot name="prepend" /> <!-- Before input -->
  <slot name="append" /> <!-- After input -->
</template>
```

### Features

1. **Automatic ID Generation**: If no `id` prop is provided, generate one based on `name` or `label`
2. **Label Association**: Automatically associate label with input via `for` attribute
3. **Error Display**: Show error message below input when `error` prop is provided
4. **Hint Text**: Display helper text below input when `hint` prop is provided
5. **Required Indicator**: Show asterisk (*) for required fields
6. **Accessibility**: Proper ARIA attributes for error states and descriptions
7. **Validation States**: Visual feedback for error/success states
8. **Character Counter**: For inputs with `maxLength` prop

### Styling Variants

#### Size Variants
- **small**: `px-2 py-0.5 text-sm`
- **medium**: `px-3 py-1 text-base` (default)
- **large**: `px-4 py-2 text-lg`

#### Width Variants
- **full**: `w-full`
- **auto**: `w-auto`
- **sm**: `w-32` (128px)
- **md**: `w-48` (192px)
- **lg**: `w-64` (256px)
- **xl**: `w-80` (320px)
- **2xl**: `w-96` (384px)
- **3xl**: `w-[500px]`

#### State Classes
- **Default**: `border-gray-asparagus`
- **Error**: `border-red-500 focus:ring-red-500 focus:border-red-500`
- **Success**: `border-green-500 focus:ring-green-500 focus:border-green-500`
- **Disabled**: `bg-gray-100 text-gray-500 cursor-not-allowed`

### Component Structure

```vue
<template>
  <div class="base-input-wrapper">
    <label v-if="label" :for="inputId" class="base-input-label">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <div class="base-input-container">
      <slot name="prepend" />
      
      <!-- Text, Number, Email, Password, Tel, Url -->
      <input
        v-if="['text', 'number', 'email', 'password', 'tel', 'url'].includes(type)"
        :id="inputId"
        :name="name"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :min="min"
        :max="max"
        :step="step"
        :minlength="minLength"
        :maxlength="maxLength"
        :autocomplete="autocomplete"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @change="handleChange"
      />
      
      <!-- Textarea -->
      <textarea
        v-else-if="type === 'textarea'"
        :id="inputId"
        :name="name"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :rows="rows"
        :minlength="minLength"
        :maxlength="maxLength"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @change="handleChange"
      />
      
      <!-- Select -->
      <select
        v-else-if="type === 'select'"
        :id="inputId"
        :name="name"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="inputClasses"
        @change="handleChange"
        @blur="handleBlur"
        @focus="handleFocus"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      
      <!-- Checkbox -->
      <input
        v-else-if="type === 'checkbox'"
        :id="inputId"
        :name="name"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :required="required"
        :class="checkboxClasses"
        @change="handleCheckboxChange"
      />
      
      <slot name="append" />
    </div>
    
    <!-- Character counter (if maxLength) -->
    <div v-if="maxLength && type !== 'checkbox'" class="base-input-counter">
      {{ currentLength }}/{{ maxLength }}
    </div>
    
    <!-- Error message -->
    <div v-if="error" class="base-input-error" :id="`${inputId}-error`">
      {{ error }}
    </div>
    
    <!-- Hint text -->
    <div v-if="hint && !error" class="base-input-hint" :id="`${inputId}-hint`">
      {{ hint }}
    </div>
  </div>
</template>
```

## Refactoring Plan

### Phase 1: Create BaseInput Component

- [ ] **Task 1.1**: Create `BaseInput.vue` component
  - [ ] Implement all input types (text, number, email, password, textarea, select, checkbox)
  - [ ] Add size and width variants
  - [ ] Implement error and hint display
  - [ ] Add character counter for maxLength
  - [ ] Implement proper accessibility attributes
  - [ ] Add validation state styling
  - [ ] Write component documentation

- [ ] **Task 1.2**: Add BaseInput to component exports/index (if applicable)
- [ ] **Task 1.3**: Create Storybook stories or styleguide examples (if applicable)

### Phase 2: Refactor Form Components

#### Priority 1: High-Usage Forms

- [ ] **Task 2.1**: Refactor `ShopItemForm.vue`
  - [ ] Replace item search input
  - [ ] Replace buy price number input
  - [ ] Replace sell price number input
  - [ ] Replace stock quantity number input
  - [ ] Replace notes textarea
  - [ ] Replace stock full checkbox
  - [ ] Update validation to use BaseInput error prop

- [ ] **Task 2.2**: Refactor `InlinePriceInput.vue`
  - [ ] Consider if this should use BaseInput or remain specialized
  - [ ] If refactoring, ensure inline editing behavior is preserved

- [ ] **Task 2.3**: Refactor `AccountView.vue`
  - [ ] Replace Minecraft username input
  - [ ] Replace display name input
  - [ ] Replace bio textarea (if exists)
  - [ ] Replace use Minecraft username checkbox

#### Priority 2: Authentication Forms

- [ ] **Task 2.4**: Refactor `SignInView.vue`
  - [ ] Replace email input
  - [ ] Replace password input

- [ ] **Task 2.5**: Refactor `SignUpView.vue`
  - [ ] Replace email input
  - [ ] Replace password input
  - [ ] Replace display name input (if exists)

#### Priority 3: Message Forms

- [ ] **Task 2.6**: Refactor `AdminSuggestionMessageForm.vue`
  - [ ] Replace message textarea
  - [ ] Add character counter using maxLength prop

- [ ] **Task 2.7**: Refactor `SuggestionMessageForm.vue`
  - [ ] Replace message textarea
  - [ ] Add character counter using maxLength prop

#### Priority 4: Other Forms

- [ ] **Task 2.8**: Refactor `CrateSingleView.vue`
  - [ ] Identify and replace all price inputs
  - [ ] Replace any other form inputs

- [ ] **Task 2.9**: Refactor `EditItemView.vue`
  - [ ] Replace price inputs
  - [ ] Replace any other form inputs

- [ ] **Task 2.10**: Refactor `CrateRewardManagerView.vue`
  - [ ] Replace any form inputs

- [ ] **Task 2.11**: Refactor any other views with form inputs
  - [ ] Search through codebase for remaining `<input>` and `<textarea>` tags
  - [ ] Replace with BaseInput component

### Phase 3: Testing and Validation

- [ ] **Task 3.1**: Visual Testing
  - [ ] Verify all inputs look consistent
  - [ ] Test all size and width variants
  - [ ] Test error and success states
  - [ ] Test disabled and readonly states
  - [ ] Test on mobile devices

- [ ] **Task 3.2**: Functional Testing
  - [ ] Test v-model binding works correctly
  - [ ] Test all input types function properly
  - [ ] Test validation and error display
  - [ ] Test character counter
  - [ ] Test accessibility (keyboard navigation, screen readers)

- [ ] **Task 3.3**: Cypress Testing
  - [ ] Update existing Cypress tests to use new selectors
  - [ ] Add tests for BaseInput component
  - [ ] Verify form submission still works

- [ ] **Task 3.4**: Linting and Formatting
  - [ ] Run `npm run lint` and fix any issues
  - [ ] Run `npm run format` to ensure consistent formatting
  - [ ] Verify build succeeds with `npm run build`

### Phase 4: Documentation

- [ ] **Task 4.1**: Update component documentation
  - [ ] Document all props and events
  - [ ] Add usage examples for each input type
  - [ ] Document styling variants
  - [ ] Add accessibility guidelines

- [ ] **Task 4.2**: Update styleguide (if applicable)
  - [ ] Add BaseInput examples to `StyleguideView.vue`
  - [ ] Show all variants and states

## Implementation Guidelines

### Migration Pattern

When refactoring an existing input:

1. **Identify the input**: Find the `<input>`, `<textarea>`, or `<select>` tag
2. **Extract props**: Identify all attributes and classes
3. **Map to BaseInput**: Convert attributes to BaseInput props
4. **Handle v-model**: Use `v-model` on BaseInput
5. **Handle events**: Map event handlers to BaseInput events
6. **Test**: Verify functionality remains the same

### Example Migration

**Before:**
```vue
<label for="buy-price" class="block text-sm font-medium text-gray-700 mb-1">
  Buy Price
</label>
<input
  id="buy-price"
  :value="formData.buy_price"
  @input="handlePriceInput('buy_price', $event)"
  type="number"
  step="0.01"
  min="0"
  placeholder="0.00"
  class="mt-2 block w-[150px] rounded border-2 border-gray-asparagus px-3 py-1 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans" />
```

**After:**
```vue
<BaseInput
  v-model="formData.buy_price"
  type="number"
  label="Buy Price"
  id="buy-price"
  name="buy_price"
  step="0.01"
  min="0"
  placeholder="0.00"
  width="sm"
  @input="handlePriceInput('buy_price', $event)"
/>
```

### Special Cases

1. **InlinePriceInput**: This is a specialized component with click-to-edit behavior. Consider keeping it as-is or creating a specialized variant of BaseInput.

2. **Search Inputs**: May need special styling or icons. Use `prepend` or `append` slots.

3. **Custom Validation**: Some forms have complex validation logic. BaseInput should handle simple validation display, but complex validation can still be handled in parent components.

4. **Conditional Rendering**: Some inputs are conditionally shown. BaseInput should work with `v-if`/`v-show` just like native inputs.

## Success Criteria

1. ✅ All form inputs use BaseInput component
2. ✅ Consistent styling across all inputs
3. ✅ All inputs have proper labels and accessibility attributes
4. ✅ Error states are displayed consistently
5. ✅ No visual regressions in existing forms
6. ✅ All existing functionality preserved
7. ✅ Code reduction: Less repetitive styling code
8. ✅ Improved developer experience: Easier to create new forms

## Future Enhancements

1. **Date/Time Inputs**: Add support for date and time input types
2. **File Inputs**: Add support for file upload inputs
3. **Rich Text Editor**: Consider adding a rich text editor variant
4. **Autocomplete**: Add autocomplete/typeahead functionality
5. **Input Groups**: Support for input groups (e.g., currency symbol prefix)
6. **Validation Rules**: Built-in validation rules (email, URL, etc.)
7. **Internationalization**: Support for i18n labels and error messages

## Dependencies

- Vue 3 (already in use)
- Tailwind CSS (already in use)
- Existing base components pattern (BaseButton, BaseCard, etc.)

## Timeline Estimate

- **Phase 1**: 1-2 days (BaseInput component creation)
- **Phase 2**: 3-5 days (Refactoring all forms)
- **Phase 3**: 1-2 days (Testing)
- **Phase 4**: 0.5-1 day (Documentation)

**Total**: 5-10 days

## Notes

- This refactor should be done incrementally, one form at a time
- Test each form after refactoring before moving to the next
- Keep the existing functionality intact - this is primarily a styling/component refactor
- Consider creating a migration checklist to track progress

