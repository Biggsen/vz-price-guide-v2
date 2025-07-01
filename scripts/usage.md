# addVersionField.js Usage

## Purpose

This Node.js script adds version and version_removed fields to all existing items in your Firestore database. This is essential for supporting multiple Minecraft versions by marking when each item was introduced and when it might be removed.

## Prerequisites

1. **Node.js** installed on your system
2. **firebase-admin** package: `npm install firebase-admin`
3. **Firebase service account key** JSON file

## Setup

1. Obtain your Firebase service account key JSON file from the Firebase Console:

    - Go to Project Settings → Service Accounts
    - Generate new private key
    - Save the JSON file as `service-account.json` in the project root

2. The script automatically resolves the path to your service account file

## Configuration

The script has two important constants:

-   `DRY_RUN`: Controls whether changes are actually made
    -   `DRY_RUN = true`: Only logs what would be updated (safe for testing)
    -   `DRY_RUN = false`: Actually updates the Firestore database
-   `VERSION_TO_ADD`: The version to add to all items (default: "1.16")

## How it Works

The script:

1. Connects to your Firestore database using the service account credentials
2. Fetches all documents from the 'items' collection
3. For each item:
    - Checks if the item is missing the `version` field and/or `version_removed` field
    - Adds the specified version field to items that don't have one
    - Adds the `version_removed` field with a `null` value to items that don't have one
    - Skips items that already have both fields
    - Logs the progress and any errors

## Usage

1. **Test run (recommended first):**

    ```bash
    # Ensure DRY_RUN = true in the script
    node scripts/addVersionField.js
    ```

2. **Apply the migration:**
    ```bash
    # Set DRY_RUN = false in the script
    node scripts/addVersionField.js
    ```

## Example

If you have an item without version fields:

```javascript
{
  name: "stone",
  material_id: "stone",
  price: 1.0
  // No version or version_removed fields
}
```

The script will update it to:

```javascript
{
  name: "stone",
  material_id: "stone",
  price: 1.0,
  version: "1.16",        // Added by script
  version_removed: null   // Added by script
}
```

## Output

The script provides detailed console output showing:

-   Migration progress with version and dry run status
-   Each item being processed or skipped
-   Summary with counts of updated, skipped, and failed items
-   Clear indication of whether changes were actually made

## Safety Features

-   **DRY_RUN mode**: Preview all changes before applying them
-   **Skip existing fields**: Won't overwrite items that already have version or version_removed fields
-   **Selective updates**: Only adds the fields that are missing from each item
-   **Error handling**: Continues processing even if individual items fail
-   **Detailed logging**: Shows exactly what's happening with each item
-   **Safe default**: Starts in DRY_RUN mode to prevent accidental changes

## Notes

-   This is typically a one-time migration script
-   Essential for supporting multiple Minecraft versions in your app
-   The version field indicates when an item was first introduced
-   The version_removed field tracks when an item might be removed (null = still available)
-   Items with existing version and version_removed fields are automatically skipped

---

# cleanImageUrls.js Usage

## Purpose

This Node.js script cleans up image URLs in Firestore by removing unwanted parameters or suffixes that come after the actual image file extension (.png or .gif).

## Prerequisites

1. **Node.js** installed on your system
2. **firebase-admin** package: `npm install firebase-admin`
3. **Firebase service account key** JSON file

## Setup

1. Obtain your Firebase service account key JSON file from the Firebase Console:

    - Go to Project Settings → Service Accounts
    - Generate new private key
    - Save the JSON file as `service-account.json` in the project root

2. Update the path to your service account file in the script:
    ```javascript
    const serviceAccount = require('../service-account.json')
    ```

## Configuration

The script has a `DRY_RUN` constant that controls its behavior:

-   `DRY_RUN = true`: Only logs what would be updated (safe for testing)
-   `DRY_RUN = false`: Actually updates the Firestore database

## How it Works

The script:

1. Connects to your Firestore database using the service account credentials
2. Fetches all documents from the 'items' collection
3. For each item with an image URL:
    - Skips URLs that already end with `.png` or `.gif`
    - Cleans URLs by truncating everything after the first occurrence of `.png` or `.gif`
    - Updates the document in Firestore (or logs the change if in DRY_RUN mode)

## Usage

1. **Test run (recommended first):**

    ```bash
    # Ensure DRY_RUN = true in the script
    node scripts/cleanImageUrls.js
    ```

2. **Actual cleanup:**
    ```bash
    # Set DRY_RUN = false in the script
    node scripts/cleanImageUrls.js
    ```

## Example

If an item has an image URL like:

```
https://example.com/image.png?size=large&quality=high
```

The script will clean it to:

```
https://example.com/image.png
```

## Output

The script provides console output showing:

-   Items being processed
-   URLs being cleaned
-   Success/failure counts
-   Any errors encountered

## Safety Features

-   DRY_RUN mode allows you to preview changes before applying them
-   Only processes items that actually need cleaning
-   Provides detailed logging of all operations
-   Error handling for failed updates

---

# fetchImages.js Usage

## Purpose

This Node.js script automatically fetches image URLs from Minecraft Wiki for items in your Firestore database that don't already have images. It scrapes the infobox images from wiki pages and populates your database.

## Prerequisites

1. **Node.js** installed on your system
2. **Required packages**: `npm install firebase-admin axios cheerio fs`
3. **Firebase service account key** JSON file

## Setup

1. Obtain your Firebase service account key JSON file from the Firebase Console:

    - Go to Project Settings → Service Accounts
    - Generate new private key
    - Save the JSON file as `service-account.json` in the project root

2. Update the path to your service account file in the script:
    ```javascript
    const serviceAccount = require('../service-account.json')
    ```

## Configuration

The script has a `DRY_RUN` constant that controls its behavior:

-   `DRY_RUN = true`: Only logs what would be updated (safe for testing)
-   `DRY_RUN = false`: Actually updates the Firestore database with images and URLs

## How it Works

The script:

1. Connects to your Firestore database using the service account credentials
2. Fetches all documents from the 'items' collection
3. For each item **without an existing image**:
    - Constructs or uses the wiki URL (from `item.url` or generated from `item.name`)
    - Scrapes the first infobox image from the Minecraft Wiki page
    - Processes the image URL (removes query params, resizes to 50px width, cleans up)
    - Updates the Firestore document with both the image URL and wiki URL

## Wiki URL Generation

-   If an item has a `url` field, it uses that
-   Otherwise, it constructs the URL from the item name:
    -   Replaces underscores with spaces
    -   Capitalizes words
    -   Creates: `https://minecraft.fandom.com/wiki/Item_Name`

## Image Processing

The script automatically:

-   Extracts the first image from the wiki page's infobox
-   Removes query parameters from the URL
-   Resizes images to 50px width (replaces `/268` with `/50`)
-   Truncates everything after `.png` to ensure clean URLs

## Usage

1. **Install dependencies:**

    ```bash
    npm install firebase-admin axios cheerio fs
    ```

2. **Test run (recommended first):**

    ```bash
    # Ensure DRY_RUN = true in the script
    node scripts/fetchImages.js
    ```

3. **Actual image fetching:**
    ```bash
    # Set DRY_RUN = false in the script
    node scripts/fetchImages.js
    ```

## Example

For an item named "ancient_debris", the script will:

1. Generate wiki URL: `https://minecraft.fandom.com/wiki/Ancient_Debris`
2. Scrape the infobox image
3. Process the image URL to something like: `https://static.wikia.nocookie.net/minecraft_gamepedia/images/5/50/Ancient_Debris_JE2_BE1.png`
4. Update the Firestore document with both the image URL and wiki URL

## Output

The script provides console output showing:

-   Items being processed
-   Successfully fetched images with URLs
-   Items where no images were found
-   Success/failure counts
-   Any errors encountered

## Safety Features

-   **Selective processing**: Only updates items that don't already have images
-   **DRY_RUN mode**: Preview changes before applying them
-   **Error handling**: Continues processing even if individual items fail
-   **Detailed logging**: Shows exactly what's being updated
-   **URL validation**: Handles various wiki URL formats and edge cases

## Notes

-   The script is specifically designed for Minecraft Wiki scraping
-   It targets the infobox images which are typically the main item images
-   Image URLs are processed to be consistent and clean
-   Both image URL and wiki URL are stored for future reference

---

# getGalleryImageUrls.js Usage

## Purpose

This Node.js script fetches specific images from Minecraft Wiki gallery sections or tabbed content for individual items. Unlike `fetchImages.js` which processes all items in bulk, this script targets specific items and image variants with precise control.

## Prerequisites

1. **Node.js** installed on your system
2. **Required packages**: `npm install firebase-admin axios cheerio`
3. **Firebase service account key** JSON file

## Setup

1. Obtain your Firebase service account key JSON file from the Firebase Console:
    - Go to Project Settings → Service Accounts
    - Generate new private key
    - Save the JSON file as `service-account.json` in the project root

## Configuration

The script has a `DRY_RUN` constant that controls its behavior:

-   `DRY_RUN = true`: Only logs what would be updated (safe for testing)
-   `DRY_RUN = false`: Actually updates the Firestore database with the found image

## Command Line Arguments

The script accepts several command-line arguments to target specific images:

### Required:

-   `item:ItemName` - The name of the item to search for

### Optional:

-   `tabbed:VariantAlt` - For images in tabbed sections (e.g., different variants)
-   `gallery:GalleryAlt` - For images in gallery sections with specific alt text
-   `gallery:[item1, item2, item3]` - Process multiple gallery items at once
-   `altsuffix:AltSuffix` - Suffix to append to gallery item names

## Usage Examples

### Basic gallery image:

```bash
node scripts/getGalleryImageUrls.js item:Allium
```

### Tabbed content (variants):

```bash
node scripts/getGalleryImageUrls.js item:Wood tabbed:"Oak Wood"
```

### Specific gallery item:

```bash
node scripts/getGalleryImageUrls.js item:Flowers gallery:"Red Tulip"
```

### Multiple gallery items:

```bash
node scripts/getGalleryImageUrls.js item:Wool gallery:["White Wool", "Red Wool", "Blue Wool"]
```

### Gallery items with suffix:

```bash
node scripts/getGalleryImageUrls.js item:Concrete gallery:["White", "Red", "Blue"] altsuffix:"Concrete"
```

## How it Works

The script:

1. Parses command-line arguments to determine target item and image type
2. Constructs the wiki URL from the item name
3. Fetches and follows redirects to get the final wiki page
4. Depending on the arguments:
    - **Gallery mode**: Searches `li.gallerybox img` elements for matching alt text
    - **Tabbed mode**: Searches `.wds-tab__content img` elements in aside sections
    - **Array mode**: Processes multiple gallery items in sequence
5. Extracts and cleans the image URL (removes query params, truncates after .png)
6. Updates the corresponding Firestore item by name

## Image Processing

The script automatically:

-   Prioritizes `data-src` over `srcset` over `src` attributes
-   Handles srcset by taking the first URL
-   Removes query parameters from URLs
-   Truncates everything after `.png` for clean URLs
-   Follows redirects to get the final wiki page URL

## Firestore Updates

-   Queries Firestore for items matching the specified name (case-sensitive)
-   Updates the `image` field with the found URL
-   For array processing, updates multiple items based on constructed names

## Output Examples

```bash
# Single item
Image URL for 'Allium': https://static.wikia.nocookie.net/minecraft_gamepedia/images/b/b7/Allium_JE7_BE2.png
Wiki page: https://minecraft.fandom.com/wiki/Allium

# Multiple items
Image URL for 'Wool' (gallery: White Wool): https://static.wikia.nocookie.net/minecraft_gamepedia/images/1/14/White_Wool_JE3_BE3.png
Image URL for 'Wool' (gallery: Red Wool): https://static.wikia.nocookie.net/minecraft_gamepedia/images/8/8c/Red_Wool_JE3_BE3.png
```

## Use Cases

-   **Variant items**: Get specific color/type variants from gallery sections
-   **Tabbed content**: Extract images from different tabs (Java vs Bedrock editions)
-   **Bulk variant processing**: Process multiple related items in one command
-   **Precise targeting**: When `fetchImages.js` gets the wrong image or you need a specific variant
-   **Manual corrections**: Fix individual items that need specific gallery images

## Safety Features

-   **DRY_RUN mode**: Preview what would be updated before making changes
-   **Error handling**: Gracefully handles missing items or failed requests
-   **Redirect following**: Automatically follows wiki redirects to final pages
-   **Flexible matching**: Handles various image attribute combinations
-   **Detailed logging**: Shows exactly which images are found and updated

## Notes

-   This script is designed for precision rather than bulk processing
-   It's perfect for handling edge cases that the bulk `fetchImages.js` script can't handle
-   The array syntax allows processing multiple related items efficiently
-   Alt text matching is case-insensitive for better reliability

---

# addEnchantedBooks.js Usage

## Purpose

This Node.js script bulk adds all enchanted books to your Firestore database. It generates individual enchanted book entries for every enchantment and level combination in Minecraft 1.16, rather than having just one generic "Enchanted Book" item.

## Prerequisites

1. **Node.js** installed on your system
2. **firebase-admin** package: `npm install firebase-admin`
3. **Firebase service account key** JSON file

## Setup

1. Obtain your Firebase service account key JSON file from the Firebase Console:

    - Go to Project Settings → Service Accounts
    - Generate new private key
    - Save the JSON file as `service-account.json` in the project root

2. The script automatically resolves the path to your service account file

## Configuration

The script has important constants you can customize:

### DRY_RUN

-   `DRY_RUN = true`: Only logs what would be added (safe for testing)
-   `DRY_RUN = false`: Actually adds items to the Firestore database

### ENCHANTED_BOOK_DEFAULTS

Default values applied to all enchanted books:

-   `image`: Wiki image URL for enchanted books
-   `url`: Wiki URL for enchanted books
-   `stack`: Stack size (1 for enchanted books)
-   `category`: "utility" (since "magic" isn't in your current enabled categories)
-   `subcategory`: "Enchanted Books"
-   `price`: Base price (5.0, increases with enchantment level)

### ENCHANTMENTS

Complete list of all 1.16 enchantments with their maximum levels, organized by type:

-   **Armor Enchantments**: Protection, Fire Protection, Feather Falling, etc.
-   **Weapon Enchantments**: Sharpness, Smite, Looting, etc.
-   **Ranged Weapon Enchantments**: Power, Punch, Multishot, etc.
-   **Tool Enchantments**: Efficiency, Silk Touch, Fortune, etc.
-   **Universal Enchantments**: Mending, Unbreaking, Curses

## How it Works

The script:

1. Connects to your Firestore database using the service account credentials
2. Generates all possible enchanted book combinations:
    - For each enchantment, creates books for levels 1 through max level
    - Uses Roman numerals for level display (I, II, III, IV, V)
    - Single-level enchantments don't show level numbers
3. For each generated book:
    - Checks if it already exists in the database (by `material_id`)
    - Skips books that already exist
    - Adds new books with proper naming and pricing
4. Provides detailed logging and summary statistics

## Generated Items

The script will generate approximately **100+ enchanted books**, including:

-   **Protection I** through **Protection IV**
-   **Sharpness I** through **Sharpness V**
-   **Efficiency I** through **Efficiency V**
-   **Mending** (single level)
-   **Silk Touch** (single level)
-   And many more...

Each book gets:

-   **Name**: `enchanted book (protection i)`, `enchanted book (sharpness v)`, etc.
-   **Material ID**: `enchanted_book_protection_1`, `enchanted_book_sharpness_5`, etc.
-   **Price**: Base price + (level - 1) × 2 (so higher levels cost more)

## Usage

1. **Test run (recommended first):**

    ```bash
    # Ensure DRY_RUN = true in the script
    node scripts/addEnchantedBooks.js
    ```

2. **Add the books:**
    ```bash
    # Set DRY_RUN = false in the script
    node scripts/addEnchantedBooks.js
    ```

## Example Output

```
Starting bulk addition of enchanted books...
DRY RUN mode: ENABLED

Generated 87 enchanted books

[DRY RUN] Would add: enchanted book (protection i) (enchanted_book_protection_1) - Price: $5
[DRY RUN] Would add: enchanted book (protection ii) (enchanted_book_protection_2) - Price: $7
[DRY RUN] Would add: enchanted book (sharpness v) (enchanted_book_sharpness_5) - Price: $13
...

============================================================
BULK ADDITION SUMMARY
============================================================
Total enchanted books processed: 87
Books would be added: 87
Books skipped (already exist): 0
Books failed: 0

🔍 This was a DRY RUN - no changes were made.
💡 Set DRY_RUN = false to apply changes.
```

## Safety Features

-   **DRY_RUN mode** allows you to preview all changes before applying them
-   **Duplicate detection** prevents adding books that already exist
-   **Error handling** for failed additions with detailed logging
-   **Comprehensive logging** shows exactly what's being added
-   **Transaction safety** - each book is added individually so partial failures don't corrupt the whole operation

## Customization

You can easily customize the script by:

1. **Adjusting pricing**: Modify the `price` calculation in `generateEnchantedBooks()`
2. **Adding/removing enchantments**: Update the `ENCHANTMENTS` object
3. **Changing defaults**: Modify `ENCHANTED_BOOK_DEFAULTS`
4. **Custom categorization**: Change the `category` and `subcategory` values

## Post-Addition

After running the script successfully:

1. **Use your bulk update tools** to adjust prices if needed
2. **Add images** using your existing image fetching scripts
3. **Categorize further** if you want more specific subcategories
4. **Verify in your web app** that all books appear correctly

This script integrates seamlessly with your existing admin tools and bulk update functionality.
