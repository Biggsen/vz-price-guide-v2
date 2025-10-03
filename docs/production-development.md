# Production Database Development

This guide explains how to safely work with the production database locally for development purposes.

## ⚠️ Important Safety Notice

**Working with the production database is inherently risky.** All changes will affect live users and data. Use with extreme caution and always double-check your actions.

## Setup

### 1. Environment Configuration

Copy the example environment file and configure it:

```bash
cp env.production.example .env.production
```

Edit `.env.production` with your actual Firebase configuration values:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=vz-price-guide.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vz-price-guide
VITE_FIREBASE_STORAGE_BUCKET=vz-price-guide.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
VITE_FIREBASE_APP_ID=your_actual_app_id
VITE_FIREBASE_EMULATORS=0
VITE_DEV_MODE=production
```

### 2. Running in Production Mode

Use the new npm scripts to run against the production database:

```bash
# Standard production development (with warnings)
npm run dev:prod

# Production development with confirmation dialogs
npm run dev:prod:confirm
```

## Safety Features

### Automatic Warnings

The application automatically detects when you're connected to the production database and shows warnings in the console:

```
🚨 PRODUCTION DATABASE MODE ACTIVE 🚨
You are connected to the live production database.
All changes will affect live users and data.
```

### Safety Utilities

Use the production safety utilities in your code:

```javascript
import {
	getSafetyStatus,
	confirmProductionOperation,
	safeProductionOperation,
	logEnvironmentInfo
} from '@/utils/productionSafety'

// Check current environment
const status = getSafetyStatus()
console.log('Is safe:', status.isSafe)

// Confirm before dangerous operations
if (confirmProductionOperation('adding new item')) {
	// Proceed with operation
}

// Safe wrapper for operations
await safeProductionOperation(
	'bulk update',
	async () => {
		// Your operation here
	},
	{ operationName: 'Bulk Item Update' }
)

// Log environment info for debugging
logEnvironmentInfo()
```

## Best Practices

### 1. Always Use Confirmation

Use the `confirmProductionOperation()` function before any write operations:

```javascript
// Good
if (confirmProductionOperation('adding new item')) {
	await addItem(itemData)
}

// Better - use safe wrapper
await safeProductionOperation('add item', () => addItem(itemData), {
	operationName: 'Add New Item'
})
```

### 2. Test First

Always test your changes in emulator mode first:

```bash
# Test in emulator
npm run emulators
npm run dev

# Then test in production mode
npm run dev:prod:confirm
```

### 3. Use Dry Run Mode

For scripts, always use `DRY_RUN=true` first:

```bash
# Test script without changes
DRY_RUN=true node scripts/your-script.js

# Run for real
node scripts/your-script.js
```

### 4. Monitor Console Warnings

Always pay attention to console warnings and confirmations. The application will warn you when you're in production mode.

## Environment Modes

| Mode                     | Command                    | Database   | Emulators | Safety Level                  |
| ------------------------ | -------------------------- | ---------- | --------- | ----------------------------- |
| Development              | `npm run dev`              | Emulator   | ✅ On     | ✅ Safe                       |
| Production Dev           | `npm run dev:prod`         | Production | ❌ Off    | ⚠️ Production                 |
| Production Dev (Confirm) | `npm run dev:prod:confirm` | Production | ❌ Off    | ⚠️ Production + Confirmations |

## Emergency Procedures

If you accidentally make changes to production:

1. **Stop immediately** - Close the development server
2. **Assess impact** - Check what was changed
3. **Revert if needed** - Use Firebase console or scripts to revert
4. **Document** - Record what happened for future reference

## Script Safety

All scripts in the `scripts/` directory have built-in safety measures:

-   They refuse to run against production databases by default
-   Use `DRY_RUN=true` to test without making changes
-   Require explicit confirmation for production operations

## Troubleshooting

### Connection Issues

If you can't connect to production:

1. Check your `.env.production` file has correct values
2. Ensure you're authenticated with Firebase CLI: `firebase login`
3. Verify project access: `firebase projects:list`

### Authentication Issues

If you can't authenticate:

1. Check your Firebase Auth configuration
2. Ensure your user has admin privileges in production
3. Try signing out and back in

### Safety Warnings Not Showing

If you don't see safety warnings:

1. Check browser console for messages
2. Verify `VITE_FIREBASE_EMULATORS=0` in your environment
3. Confirm you're using the production project ID

## Remember

-   **Production data is live** - Every change affects real users
-   **Always test first** - Use emulators before production
-   **Use confirmations** - Don't skip safety checks
-   **Document changes** - Keep track of what you modify
-   **Have a rollback plan** - Know how to undo changes
