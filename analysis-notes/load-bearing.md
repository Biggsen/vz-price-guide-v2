Based on repo-map.md, here are the 10-15 most load-bearing files in this repository:


1. src/main.js

What it does: Primary Vue application entry point and bootstrap configuration Why high-impact: Single point of failure for entire frontend
application initialisation What depends on it: All Vue components, routing system, Firebase integration, global state management What
would break: Complete frontend application failure, no user interface would load


2. functions/index.js

What it does: Cloud Functions entry point and serverless API gateway Why high-impact: Central orchestration point for all backend services
and Firebase functions What depends on it: User authentication flows, shop management APIs, data processing pipelines What would break:
All server-side functionality, authentication systems, data mutations


3. src/utils/pricing.js

What it does: Core pricing calculations, currency formatting, and diamond ratio computations Why high-impact: Fundamental to the
application's primary business logic (price guide functionality) What depends on it: All price displays, shop comparisons, item
valuations, export features, recipe calculations What would break: Price calculations, currency formatting, shop price comparisons,
diamond conversion ratios


4. src/router/index.js

What it does: Vue Router configuration, navigation logic, and SEO meta tag management Why high-impact: Controls all application routing
and search engine optimisation What depends on it: Page navigation, deep linking, SEO metadata, route guards, URL structure What would
break: Inter-page navigation, bookmarking, SEO rankings, route-based authentication


5. src/composables/useFilters.js

What it does: Core filtering, search functionality, and query parameter management Why high-impact: Primary user interaction mechanism for
discovering and filtering content What depends on it: Item search interfaces, category filtering, version selection, URL state persistence
What would break: Search functionality, category browsing, filter persistence, query parameter handling


6. scripts/seed-emulator.js

What it does: Database seeding, emulator setup, and development data provisioning Why high-impact: Critical for development workflow,
testing infrastructure, and data consistency What depends on it: Local development environment, automated testing suites, CI/CD pipeline
What would break: Development environment setup, test data availability, emulator functionality


7. src/utils/enchantments.js

What it does: Minecraft enchantment logic, compatibility rules, and conflict detection Why high-impact: Core domain logic specific to
Minecraft mechanics and business rules What depends on it: Enchantment interfaces, item compatibility validation, enchanted book pricing
What would break: Enchantment features, item enhancement workflows, pricing accuracy for enchanted items


8. cypress.config.js

What it does: Testing framework configuration and Firebase emulator integration Why high-impact: Ensures application quality and prevents
regressions through automated testing What depends on it: All Cypress test suites, visual regression testing, CI/CD quality gates What
would break: Automated testing pipeline, deployment quality assurance, regression detection


9. src/utils/shopItems.js

What it does: Shop data management, price comparison logic, and server-specific item handling Why high-impact: Core business logic for
shop management and price comparison features What depends on it: Shop displays, price comparison interfaces, server-specific data
management What would break: Shop functionality, price comparison features, server management capabilities


10. src/constants.js

What it does: Application-wide constants and administrative authentication logic Why high-impact: Defines system behaviour, access
control, and configuration parameters What depends on it: Administrative features, authentication flows, system-wide configuration What
would break: Admin access controls, authentication validation, system configuration


11. src/utils/analytics.js

What it does: Google Analytics integration, event tracking, and user behaviour monitoring Why high-impact: Essential for understanding
user behaviour and business intelligence What depends on it: All user interaction tracking, navigation analytics, conversion measurement
What would break: Analytics data collection, user behaviour insights, business metrics


12. scripts/start-price-guide.js

What it does: Development environment orchestration and local server coordination Why high-impact: Essential for developer productivity
and local development workflow What depends on it: Development environment setup, emulator coordination, local testing capabilities What
would break: Local development workflow, developer onboarding, debugging environment


13. src/utils/image.js

What it does: Image processing, URL generation, and Netlify image optimisation integration Why high-impact: Manages all visual assets in a
heavily visual application What depends on it: Item imagery, performance optimisation, visual content delivery What would break: Image
loading, performance optimisation, visual user experience


14. src/utils/userProfile.js

What it does: User profile management and Minecraft avatar generation Why high-impact: Core user identity management and personalisation
features What depends on it: User authentication interfaces, profile displays, avatar systems What would break: User profile
functionality, authentication UI, personalisation features


15. scripts/run-visual-tests.js

What it does: Visual regression testing automation and screenshot management Why high-impact: Maintains visual consistency and prevents UI
regressions What depends on it: CI/CD pipeline, visual quality assurance, UI consistency validation What would break: Visual regression
detection, UI quality gates, design system integrity

These files constitute the architectural foundation of what appears to be a comprehensive Minecraft price guide application with
sophisticated shop management capabilities, built upon Vue.js and Firebase infrastructure.