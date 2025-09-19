# Visual Gallery System

A comprehensive web-based UI for viewing, organizing, and comparing application screenshots captured by the visual testing system.

## Overview

The Visual Gallery provides an intuitive interface for:

-   **Browsing all screenshots** from your visual testing suite
-   **Favoriting screenshots** for quick access and comparison
-   **Filtering by category** (public pages, admin pages, modals, etc.)
-   **Searching screenshots** by name or description
-   **Fullscreen viewing** with keyboard navigation
-   **Responsive design** that works on all devices

## Components

### 1. Visual Gallery View (`src/views/VisualGalleryView.vue`)

The main gallery interface featuring:

-   **Grid layout** with thumbnail previews
-   **Category filtering** (All, Public Pages, Admin Pages, Modals, etc.)
-   **Search functionality** across names and descriptions
-   **Favorites system** with localStorage persistence
-   **Modal viewer** with fullscreen support
-   **Keyboard navigation** (arrow keys, F for favorite, Esc to close)

### 2. Screenshot Server (`scripts/serve-screenshots.js`)

Express.js server that:

-   **Serves screenshot files** from the visual-screenshots directory
-   **Provides API endpoint** (`/api/screenshots`) for metadata
-   **Auto-discovers screenshots** and generates metadata
-   **Handles CORS** for development
-   **Extracts viewport information** from filenames

### 3. Navigation Integration

Added to admin navigation under "Admin > Visual Gallery" for easy access.

## Features

### 🖼️ **Gallery View**

-   **Responsive grid** that adapts to screen size
-   **Thumbnail previews** with hover effects
-   **Category badges** on each screenshot
-   **Viewport information** display
-   **Loading states** and error handling

### ❤️ **Favorites System**

-   **Heart icon** to favorite/unfavorite screenshots
-   **Persistent storage** using localStorage
-   **Favorites-only filter** for quick access
-   **Visual indicators** for favorited items

### 🔍 **Search & Filter**

-   **Real-time search** across names and descriptions
-   **Category filtering** dropdown
-   **Combined filtering** (search + category)
-   **Empty state** handling with helpful messages

### 🖥️ **Modal Viewer**

-   **Fullscreen viewing** with image zoom
-   **Keyboard navigation** (← → arrows, F for favorite, Esc to close)
-   **Navigation arrows** for browsing
-   **Fullscreen toggle** button
-   **Screenshot metadata** display

### ⌨️ **Keyboard Shortcuts**

-   **← / →** Navigate between screenshots
-   **F** Toggle favorite status
-   **Esc** Close modal
-   **Fullscreen** support with arrow key navigation

## Usage

### Starting the Gallery

1. **Start the screenshot server:**

    ```bash
    npm run visual:serve
    ```

2. **Access the gallery:**
    - Navigate to `/visual-gallery` in your app
    - Or use the admin navigation: "Admin > Visual Gallery"

### Using the Gallery

1. **Browse screenshots** in the grid view
2. **Filter by category** using the dropdown
3. **Search** using the search box
4. **Click any screenshot** to open in modal view
5. **Use heart icon** to favorite screenshots
6. **Navigate with keyboard** in modal view

### Managing Favorites

-   **Add to favorites:** Click the heart icon on any screenshot
-   **View favorites only:** Select "⭐ Favorites" from the category filter
-   **Remove from favorites:** Click the filled heart icon

## API Endpoints

### GET `/api/screenshots`

Returns JSON array of all screenshots with metadata:

```json
[
	{
		"id": "home-default",
		"name": "Home default",
		"category": "public-pages",
		"path": "/visual-screenshots/public-pages/home-default.png",
		"description": "Screenshot of home default",
		"viewport": "1280x720",
		"filename": "home-default.png"
	}
]
```

### GET `/visual-screenshots/*`

Serves static screenshot files from the organized directory structure.

## File Structure

```
visual-screenshots/
├── public-pages/          # Public pages (home, signin, etc.)
├── admin-pages/           # Admin pages (dashboard, management)
├── user-pages/            # User pages (account, settings)
├── modals/                # Modal dialogs
├── responsive/            # Responsive breakpoints
├── errors/                # Error pages
└── README.md              # Organization documentation
```

## Integration with Visual Testing

The gallery automatically integrates with the visual testing system:

1. **Run visual tests:** `npm run visual:tests`
2. **Screenshots are organized** into categories
3. **Start gallery server:** `npm run visual:serve`
4. **View in gallery** at `/visual-gallery`

## Customization

### Adding New Categories

1. **Update categories object** in `VisualGalleryView.vue`:

    ```javascript
    const categories = {
    	'new-category': 'New Category Name'
    }
    ```

2. **Update screenshot server** to recognize new categories
3. **Reorganize screenshots** into new category folders

### Modifying Metadata

Update the `extractViewport` function in `serve-screenshots.js` to handle new viewport patterns:

```javascript
function extractViewport(filename) {
	if (filename.includes('custom-breakpoint')) return '1920x1080'
	// ... existing logic
}
```

### Styling Changes

The gallery uses Tailwind CSS classes and can be customized by:

-   Modifying the component styles
-   Updating the color scheme
-   Changing grid layouts
-   Adjusting modal behavior

## Troubleshooting

### Screenshots Not Loading

1. **Check server status:** Ensure `npm run visual:serve` is running
2. **Verify file paths:** Check that screenshots exist in `visual-screenshots/`
3. **Check console:** Look for CORS or network errors
4. **Fallback mode:** Gallery will use mock data if API is unavailable

### API Connection Issues

1. **Port conflicts:** Ensure port 3001 is available
2. **CORS issues:** Check browser console for CORS errors
3. **File permissions:** Ensure read access to screenshot directory

### Performance Issues

1. **Large images:** Consider image optimization
2. **Many screenshots:** Implement pagination if needed
3. **Slow loading:** Check network connectivity

## Future Enhancements

Potential improvements to consider:

-   **Image optimization** and lazy loading
-   **Comparison mode** for side-by-side viewing
-   **Export functionality** for sharing screenshots
-   **Annotation tools** for marking issues
-   **Version comparison** between test runs
-   **Integration with CI/CD** for automated reviews

## Security Considerations

-   **Admin-only access** (requires admin authentication)
-   **Local development** focus (no production deployment)
-   **CORS enabled** for development convenience
-   **No sensitive data** in screenshot metadata
