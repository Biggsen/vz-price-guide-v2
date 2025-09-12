# Safety Guidelines for Firebase Operations

## Overview

This document outlines safety measures to prevent accidental operations against production databases, particularly when working with Firebase emulators and seeding scripts.

## Critical Safety Rules

### 1. Never Run Seed Scripts Against Production

The `scripts/seed-emulator.js` script is **ONLY** for local development with Firebase emulators. It will:

-   ✅ **SAFE**: Run against emulators when properly configured
-   ❌ **DANGEROUS**: Require explicit confirmation to run against production
-   ❌ **DANGEROUS**: Exit with error if run against production without confirmation

### 2. Always Use npm Scripts

**Use these safe npm scripts instead of running scripts directly:**

```bash
# Safe: Seed emulator (requires emulators to be running)
npm run seed:emu

# Safe: Seed emulator with one-shot execution
npm run seed:emu:exec

# Safe: Test seeding without making changes
npm run seed:emu:dry
```

**NEVER run this directly:**

```bash
# DANGEROUS: Could run against production
node scripts/seed-emulator.js
```

### 3. Environment Variable Safety

The seed script uses multiple safety checks:

-   **Emulator Detection**: Checks for `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`
-   **Project ID Validation**: Identifies known production project IDs
-   **DRY_RUN Mode**: Set `DRY_RUN=true` to test without making changes

### 4. Production Project IDs

The following project IDs are considered production and will trigger safety warnings:

-   `vz-price-guide`
-   `vz-price-guide-prod`

## Safety Features

### Automatic Safety Checks

The seed script automatically:

1. **Detects emulator environment** using environment variables
2. **Identifies production projects** using a whitelist
3. **Requires explicit confirmation** for production operations
4. **Supports DRY_RUN mode** for testing

### Confirmation Prompt

If you accidentally try to run against production, you'll see:

```
🚨 SAFETY CHECK FAILED!
   This script is designed for emulator seeding only.
   You are about to run against a PRODUCTION database!

   If you meant to seed the emulator, make sure:
   1. Firebase emulators are running: firebase emulators:start
   2. Environment variables are set correctly
   3. You are in the correct directory

Type "YES I UNDERSTAND THE RISK" to continue:
```

### DRY_RUN Mode

Test your seeding without making changes:

```bash
# Set DRY_RUN environment variable
DRY_RUN=true npm run seed:emu

# Or use the dedicated script
npm run seed:emu:dry
```

## Development Workflow

### Recommended Workflow

1. **Start emulators:**

    ```bash
    npm run emulators
    ```

2. **Seed with test data:**

    ```bash
    npm run seed:emu
    ```

3. **Test your changes:**
    ```bash
    npm run dev
    ```

### Emergency Recovery

If you accidentally run against production:

1. **Stop the script immediately** (Ctrl+C)
2. **Check what data was modified** in the Firebase console
3. **Restore from backup** if available
4. **Review the safety measures** to prevent future incidents

## Best Practices

### For Developers

-   Always use npm scripts instead of running scripts directly
-   Test with `DRY_RUN=true` before making changes
-   Verify emulator environment variables are set correctly
-   Keep production project IDs updated in the safety whitelist

### For CI/CD

-   Never run seed scripts in production environments
-   Use environment-specific configurations
-   Implement additional safety checks in deployment pipelines

## Troubleshooting

### "Safety check failed" Error

This means the script detected a production environment. To fix:

1. Ensure emulators are running: `npm run emulators`
2. Check environment variables are set correctly
3. Verify you're using the correct npm script

### "Operation cancelled by user" Error

This means you (correctly) cancelled a production operation. To continue with emulator:

1. Start emulators: `npm run emulators`
2. Use the safe script: `npm run seed:emu`

## Environment Variables Reference

| Variable                      | Purpose                      | Safe Value                            |
| ----------------------------- | ---------------------------- | ------------------------------------- |
| `FIRESTORE_EMULATOR_HOST`     | Points to Firestore emulator | `127.0.0.1:8080`                      |
| `FIREBASE_AUTH_EMULATOR_HOST` | Points to Auth emulator      | `127.0.0.1:9099`                      |
| `VITE_FIREBASE_EMULATORS`     | Enables emulator mode        | `1` or `true`                         |
| `GCLOUD_PROJECT`              | Firebase project ID          | `demo-vz-price-guide` (for emulators) |
| `DRY_RUN`                     | Test mode without changes    | `true` or `1`                         |

## Contact

If you have questions about these safety measures or need to modify them, please review this document and the seed script implementation before making changes.
