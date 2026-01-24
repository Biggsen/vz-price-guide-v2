Based on repo-map.md, here's the most critical end-to-end runtime flow for a user browsing items with pricing data:


Critical Flow: User Item Browse → Price Display → Filter Update

1. Application Bootstrap

 • src/main.js - Vue application initialises, Firebase SDK configured, router mounted
 • src/router/index.js - Route matching occurs, navigation guards execute

2. Page Load & Component Initialisation

 • src/views/ - Target view component mounts (likely items listing page)
 • src/components/ - Child components initialise and request data

3. Data Fetching & State Management

 • src/composables/useFilters.js - Filter state initialised, query parameters parsed from URL
 • src/utils/shopItems.js - Shop item data fetched from Firestore via Firebase SDK
 • functions/index.js - Cloud Functions may process data requests or authentication

4. Business Logic Processing

 • src/utils/pricing.js - Price calculations executed, currency formatting applied, diamond ratios computed
 • src/utils/enchantments.js - Enchantment compatibility rules applied if relevant
 • src/composables/useCategorizedItemSearch.js - Search and categorisation logic processes items

5. UI Rendering & Visual Updates

 • src/utils/image.js - Image URLs generated with Netlify optimisation parameters
 • src/utils/minecraftText.js - Minecraft text formatting applied to item names/descriptions
 • Vue's reactivity system triggers component re-renders with processed data

6. User Interaction Handling

 • src/composables/useFilters.js - User filter changes captured, reactive state updated
 • src/composables/useEnchantmentSearch.js - Search queries processed if user searches
 • src/router/index.js - URL updated to reflect new filter state

7. Analytics & Tracking

 • src/utils/analytics.js - User interactions tracked via Google Analytics
 • Event data sent to analytics service for behaviour monitoring

8. State Persistence

 • src/composables/useFilters.js - Filter state persisted to URL query parameters
 • Browser history updated for navigation consistency
 • No database writes occur in this read-heavy flow

9. Performance Optimisation

 • src/utils/image.js - Images lazy-loaded with Netlify's image optimisation
 • Vue's virtual DOM efficiently updates only changed elements

This flow represents the core user experience: discovering items, viewing prices, and filtering results - the primary value proposition of
a Minecraft price guide application. The architecture emphasises reactive state management through composables whilst maintaining clean
separation between data fetching, business logic, and presentation layers.