# Version-Specific Images Feature Specification

## Summary
- Enable items to have different images for different Minecraft versions (e.g., dye image changed in 1.21)
- Follow the same pattern as `prices_by_version` with version inheritance and fallback logic
- Maintain backward compatibility with legacy `image` field
- Update all UI components to use version-aware image resolution

## Goals
- Support version-specific item images when Minecraft updates change item appearances
- Provide consistent version inheritance (fallback to previous version if current version lacks image)
- Enable admins to manage version-specific images through existing admin interfaces
- Maintain performance characteristics similar to existing price lookups
- Preserve backward compatibility for items without version-specific images

## Non-Goals
- Changing image storage location or CDN (images remain in `/images/items/`)
- Automatic image detection or fetching from external sources
- Image optimization or format conversion
- Version-specific images for recipe ingredients (uses material_id directly)

## Target Users
- **End Users**: Automatically see correct images for their selected Minecraft version
- **Admins/Editors**: Can set different images per version when items change appearance

## User Stories
- As a user viewing the price guide, I see the correct item image for my selected Minecraft version
- As an admin, I can set a different image for an item in version 1.21 when it changed from previous versions
- As an admin, I can see which versions have explicit images vs inherited images
- As an admin, I can bulk update images for specific versions

## Data Model

### Firestore Item Document Structure

```typescript
Item {
  // ... existing fields ...
  image: string; // Legacy field - kept for backward compatibility
  images_by_version?: {
    [version: string]: string; // e.g., "1_16": "/images/items/dye.png"
  };
}
```

### Version Key Format
- Use underscores: `"1_16"`, `"1_17"`, `"1_18"`, `"1_19"`, `"1_20"`, `"1_21"`
- Consistent with `prices_by_version` format

### Example Document

```json
{
  "material_id": "dye",
  "name": "Dye",
  "image": "/images/items/dye.png",
  "images_by_version": {
    "1_16": "/images/items/dye.png",
    "1_17": "/images/items/dye.png",
    "1_18": "/images/items/dye.png",
    "1_19": "/images/items/dye.png",
    "1_20": "/images/items/dye.png",
    "1_21": "/images/items/dye_v1_21.png"
  },
  "version": "1.16",
  "prices_by_version": { ... }
}
```

## Functional Requirements

### Image Resolution Logic

1. **Primary Lookup**: Check `images_by_version[version]` for exact match
2. **Version Inheritance**: If not found, find latest earlier version (same logic as `getEffectivePrice`)
3. **Legacy Fallback**: If no version-specific images exist, use `image` field
4. **Final Fallback**: Return `null` or empty string if no image available

### Version Inheritance Rules

- If viewing version `1_21` and item has images for `1_20`, `1_19`, `1_18`:
  - Use `1_20` image (latest version ≤ requested version)
- If viewing version `1_18` and item only has images for `1_20`, `1_21`:
  - Use legacy `image` field (no valid earlier version)
- Version comparison uses same logic as price inheritance (major.minor comparison)

## Implementation Details

### Core Utility Function

**File**: `src/utils/image.js`

```javascript
/**
 * Get the effective image for an item with version inheritance support
 * @param {Object} item - The item object
 * @param {string} version - Version key (e.g., "1_16")
 * @returns {string|null} - The effective image URL or null
 */
export function getEffectiveImage(item, version = '1_16') {
  // Normalize images_by_version to handle mixed version key formats
  const normalizedImages = {}
  if (item.images_by_version) {
    Object.entries(item.images_by_version).forEach(([key, value]) => {
      const normalizedKey = key.replace('.', '_')
      normalizedImages[normalizedKey] = value
    })
  }

  // Apply image inheritance (same logic as getEffectivePrice)
  if (Object.keys(normalizedImages).length > 0) {
    // First try the requested version
    if (normalizedImages[version] !== undefined) {
      return normalizedImages[version]
    }

    // If not found, try earlier versions in descending order
    const availableVersions = Object.keys(normalizedImages)
    const sortedVersions = availableVersions.sort((a, b) => {
      const aVersion = a.replace('_', '.')
      const bVersion = b.replace('_', '.')
      const [aMajor, aMinor] = aVersion.split('.').map(Number)
      const [bMajor, bMinor] = bVersion.split('.').map(Number)

      // Sort in descending order (newest first)
      if (aMajor !== bMajor) return bMajor - aMajor
      return bMinor - aMinor
    })

    // Find the latest version that's not newer than the requested version
    const requestedVersion = version.replace('_', '.')
    const [reqMajor, reqMinor] = requestedVersion.split('.').map(Number)

    for (const availableVersion of sortedVersions) {
      const availableVersionFormatted = availableVersion.replace('_', '.')
      const [avMajor, avMinor] = availableVersionFormatted.split('.').map(Number)

      // Use this version if it's not newer than requested
      if (avMajor < reqMajor || (avMajor === reqMajor && avMinor <= reqMinor)) {
        return normalizedImages[availableVersion]
      }
    }
  }

  // Final fallback to legacy image field
  return item.image || null
}

/**
 * Memoized version of getEffectiveImage (optional performance optimization)
 */
const imageCache = new Map()
export function getEffectiveImageMemoized(item, version = '1_16') {
  const cacheKey = `${item.id || item.material_id}-${version}-${
    item.images_by_version ? JSON.stringify(item.images_by_version) : 'no-images'
  }-${item.image || ''}`

  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)
  }

  const image = getEffectiveImage(item, version)
  imageCache.set(cacheKey, image)
  return image
}
```

### UI Components Requiring Updates

#### 1. Display Components (Replace `item.image` with `getEffectiveImage()`)

**ItemTable.vue**
- Line 437: Main item image display
- Note: Recipe ingredient images (line 404-406) use material_id directly - may not need change

**ShopItemsView.vue**
- Lines 1288, 1510: BaseTable image display
- Requires version context from selected version

**MarketOverviewView.vue**
- Lines 999, 1190: Table image display
- Line 647: Transform function sets `itemImage`

**ShopItemTable.vue**
- Line 535: Direct `item.itemData.image` usage

**ShopItemForm.vue**
- Lines 853, 888, 912: Form preview images

**CrateSingleView.vue**
- Line 1835: Reward display image
- Line 2276: Selected item image
- Line 2309: Editing item image
- Line 2786: Simulation result image
- Line 519-526: `getDisplayItemImageFromDoc()` function

**HomeView.vue**
- Line 327: Uses material_id directly (may not need change)

**StyleguideView.vue**
- Lines 1262, 1300: Style guide examples

#### 2. Data Transformation Functions

**tableTransform.js**
- Line 23: `image: shopItem.itemData?.image || null`
- Update to: `image: getEffectiveImage(shopItem.itemData, currentVersion) || null`

**homepage.js**
- Line 67: `if (!item.image || item.image.trim() === '')`
- Update to: `if (!getEffectiveImage(item, selectedVersion) || ...)`

#### 3. Admin Interfaces

**AddItemView.vue**
- Add version-specific image fields UI (similar to `prices_by_version`)
- Initialize `images_by_version` object when creating new item
- Line 59: Copy logic for `images_by_version` when copying items

**EditItemView.vue**
- Add version-specific image management section
- Show version-specific image inputs with inheritance indicators
- Display which versions have explicit images vs inherited
- Line 62: Form field for `images_by_version`

**BulkUpdateItemsView.vue**
- Update "Update Images" tab to support version-specific updates
- Lines 370-397: `updateSelectedImages()` - update `images_by_version[version]` instead of just `image`
- Lines 399-427: `updateSelectedImagesAsMaterialId()` - same update needed
- Add version selector for bulk image updates
- Line 1091: Display version-aware images in table

### Version Context Propagation

All components need access to the current selected version:
- Use `currentVersion` from composables or props
- Convert dot notation (`1.21`) to underscore (`1_21`) for lookup
- Pass version to `getEffectiveImage()` calls

## UX Requirements

### Admin Interface (EditItemView.vue)

1. **Version-Specific Image Section**
   - Similar layout to version-specific pricing section
   - Show all available versions for the item
   - Input field per version with inheritance indicator
   - Visual distinction between explicit and inherited images
   - "Copy from previous version" button for each version

2. **Inheritance Indicators**
   - Show which versions inherit from which earlier versions
   - Display inheritance chain (e.g., "1_19, 1_20 inherit from 1_18")
   - Highlight when a version has an explicit image vs inherited

3. **Bulk Update Interface**
   - Version selector dropdown
   - Option to update single version or multiple versions
   - Preview of which items will be affected
   - Confirmation before bulk update

### User-Facing Display

- No visible changes to end users (seamless version-aware image display)
- Images automatically update when version selector changes
- Fallback to legacy images for items without version-specific data

## Migration Strategy

### Phase 1: Add Field Support (Non-Breaking)
1. Add `getEffectiveImage()` utility function
2. Update components to use `getEffectiveImage()` but fallback to `item.image`
3. No data migration required - legacy `image` field continues to work

### Phase 2: Admin UI
1. Add version-specific image fields to AddItemView and EditItemView
2. Add bulk update support for version-specific images
3. Allow admins to populate `images_by_version` for items that need it

### Phase 3: Data Population (Optional)
1. Create migration script to copy `image` to `images_by_version` for all versions
2. Only run for items that actually need version-specific images
3. Keep legacy `image` field for backward compatibility

### Backward Compatibility
- Legacy `image` field remains as final fallback
- Items without `images_by_version` continue to work
- No breaking changes to existing data structure

## Performance Considerations

### Storage Impact
- Minimal: ~180 bytes per item if all 6 versions differ
- Most items will have identical images across versions (only store differences)

### Runtime Impact
- Similar to `getEffectivePrice()` performance
- O(1) lookup for exact version match
- O(n) worst case for version inheritance (n = number of versions, typically 6)
- Optional memoization available via `getEffectiveImageMemoized()`

### Optimization Opportunities
1. Memoize image lookups in computed properties
2. Pre-compute images when items load (store in reactive computed)
3. Cache resolved images per version in component state

## Validation & Error Handling

### Image URL Validation
- Validate image paths are valid URLs or relative paths
- Check image exists before saving (optional, may be slow)
- Warn if image path doesn't start with `/images/items/`

### Version Validation
- Ensure version keys match format (`1_16`, `1_17`, etc.)
- Normalize version keys (convert dots to underscores)
- Validate version exists in available versions list

### Error Handling
- Gracefully handle missing images (show placeholder icon)
- Log warnings when image lookup fails
- Fallback chain: `images_by_version[version]` → inheritance → `image` → `null`

## Permissions & Security

- Use existing admin/editor authentication checks
- Firestore rules: Only authorized users can modify `images_by_version`
- Read access: All users can read images (public data)
- No sensitive data in image paths

## Testing Strategy

### Unit Tests
- Test `getEffectiveImage()` with various scenarios:
  - Exact version match
  - Version inheritance (fallback to earlier version)
  - Legacy field fallback
  - Missing image (returns null)
  - Version key normalization

### Integration Tests
- Test image display in ItemTable with different versions
- Test admin interface image management
- Test bulk update functionality
- Verify version inheritance works correctly

### Cypress E2E Tests
- Test image display updates when version selector changes
- Test admin can set version-specific images
- Test bulk image update workflow
- Verify images display correctly in shop manager and crate rewards

## Documentation & Rollout

### Documentation Updates
- Update `/docs/` with version-specific image management guide
- Document `getEffectiveImage()` utility function
- Add examples of version-specific image usage

### Changelog
- Add entry to `data/updates.json` describing feature
- Note backward compatibility with legacy `image` field

### Rollout Plan
1. Deploy utility function and component updates (Phase 1)
2. Deploy admin UI (Phase 2)
3. Communicate to admins how to use version-specific images
4. Optional: Run migration script for items that need it (Phase 3)

## Related Features

- **Version-Specific Pricing**: Uses same pattern (`prices_by_version`)
- **Recipe Version Copy**: Similar workflow for copying version-specific data
- **Bulk Update Items**: Extends existing bulk update functionality

## Open Questions

1. Should recipe ingredient images also be version-aware? (Currently uses material_id directly)
2. Should we validate image file existence before saving?
3. Should we auto-populate `images_by_version` from `image` field during migration?
4. Do we need image caching/CDN considerations for version-specific images?

