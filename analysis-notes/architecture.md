Based on the repo-map.md, here's a high-level architecture overview:

Major Modules/Domains

Frontend Application (src/)

 • Vue.js-based web application utilising the Composition API pattern
 • Core domains: item cataloguing, shop management, user authentication, pricing calculations
 • Minecraft-specific utilities for text formatting, enchantments, and asset management

Backend Services (functions/)

 • Firebase Cloud Functions providing serverless backend logic
 • Handles authentication, data processing, and API endpoints

Data Management & Tooling (scripts/)

 • Database migration and seeding utilities
 • Asset processing pipelines for Minecraft imagery
 • Reporting and analytics tooling

Quality Assurance (cypress/)

 • End-to-end testing with comprehensive visual regression capabilities
 • Screenshot comparison and UI consistency validation


Key Entrypoints

Runtime:

 • src/main.js - Primary Vue application bootstrap
 • functions/index.js - Cloud Functions service entry point

Build & Configuration:

 • vite.config.js - Frontend build toolchain configuration
 • cypress.config.js - Testing framework configuration

CLI & Automation:

 • scripts/seed-emulator.js - Database seeding and emulator setup
 • scripts/start-price-guide.js - Development environment orchestration
 • scripts/run-visual-tests.js - Automated visual testing pipeline


Data Flow Architecture

Three-Tier Reactive Architecture:

 1 Presentation Layer (src/views/, src/components/) - Vue components with reactive templates
 2 Business Logic Layer (src/composables/, src/utils/) - Composable functions and domain utilities
 3 Data Persistence Layer (Firebase integration via functions/) - Serverless functions and Firestore database

Data Flow Patterns:

 • Frontend → Firebase Authentication → Cloud Functions → Firestore Database
 • Reactive state management through Vue composables (src/composables/)
 • Cross-cutting concerns handled via utility modules (src/utils/)


Architectural Pattern

Composable-Driven Vue.js Architecture with Firebase Backend-as-a-Service:

Primary Characteristics:

 • Composition API Pattern: Leverages Vue 3's composables for reactive state management and business logic encapsulation
 • JAMstack Architecture: Static site generation with serverless functions and client-side hydration
 • Domain-Driven Utilities: Modular utility functions organised by business domain (pricing, enchantments, shop management)
 • Firebase-as-a-Backend: Serverless architecture with managed authentication, database, and hosting

Modular Organisation:

 • Reactive data management via composables (src/composables/useFilters.js, src/composables/useCategorizedItemSearch.js)
 • Domain-specific utilities (src/utils/pricing.js, src/utils/enchantments.js, src/utils/shopItems.js)
 • Asset pipeline optimisation for Minecraft-specific content
 • Comprehensive testing strategy with visual regression capabilities

The architecture suggests a sophisticated Minecraft price guide and shop management platform, built using modern web technologies with a
focus on reactive user experiences and comprehensive quality assurance.