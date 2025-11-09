# Netlify Blobs Media Guide

## Overview

The application now stores item imagery in the Netlify Blobs `media` store instead of the repo's static assets. Uploads are handled through Netlify Functions and can be managed from the new `Media Manager` admin page (`/admin/media`). Images continue to be delivered through Netlify Image CDN for transforms and caching.

---

## Configuration

### Environment variables

Set the following variables in both Netlify site settings and local `.env` files:

- `ADMIN_MEDIA_KEY`: secret string used by Netlify Functions to authorize media mutations
- `VITE_ADMIN_MEDIA_KEY`: matching value exposed to the frontend for authenticated admin requests

Example `.env.production` snippet:

```
ADMIN_MEDIA_KEY=super-secret-admin-token
VITE_ADMIN_MEDIA_KEY=super-secret-admin-token
```

### Netlify settings

`netlify.toml` now declares:

```
[functions]
	directory = "netlify/functions"
	node_bundler = "esbuild"

[[blobs]]
	id = "media"
```

No additional deploy configuration is required once the environment variables are applied.

---

## Media Operations

### Uploads

- API: `POST /api/upload-items`
- Required headers: `x-admin-media-key: <VITE_ADMIN_MEDIA_KEY>`
- Body: `multipart/form-data` with `file` and `path` (e.g. `items/wood/1_21/oak_log.webp`)
- Response includes `path`, `blobUrl`, and `imageUrl`

### Deletes

- API: `POST /api/delete-item`
- Body: JSON `{ "path": "items/wood/1_21/oak_log.webp" }`

### Listing

- API: `GET /api/list-media?prefix=items/wood/`
- Returns directories and blob keys for the given prefix

---

## Admin Media Manager

Visit `/admin/media` (admin users only) to:

- Drag/drop an image file to pre-fill the target blob path
- Upload files directly to Netlify Blobs
- Browse existing directories and preview stored images
- Copy blob keys, blob URLs, or CDN URLs
- Delete obsolete assets

All stored paths are normalized to the `items/*` namespace; the Media Manager enforces this automatically.

---

## Migrating Existing Assets

Legacy item images live under `public/images/items`. Run the helper script once to copy them into Netlify Blobs:

```
ADMIN_MEDIA_KEY=<your token> \
MEDIA_UPLOAD_BASE_URL=https://your-site.netlify.app \
node scripts/migratePublicImagesToBlobs.js
```

Options:

- Set `DRY_RUN=true` to preview without uploading.
- Override `MEDIA_SOURCE_DIR` if the files live somewhere else.
- When testing against `netlify dev`, omit `MEDIA_UPLOAD_BASE_URL` (defaults to `http://localhost:8888`).

After migration, update Firestore `image` fields to reference the new keys (e.g. `items/wood/1_21/oak_log.webp`) so the frontend serves them from the blob store.

---

## Frontend Usage

- Store Firestore `image` fields as blob keys (`items/.../some.webp`)
- Use `getImageUrl(image, { width })` to render images; it returns Netlify CDN URLs in production and direct blob paths in development.
- Legacy `/images/items/*` paths continue to render but should be migrated to blob keys where possible.

---

## Local Development Tips

1. Define `ADMIN_MEDIA_KEY` and `VITE_ADMIN_MEDIA_KEY` in `.env` (they must match).
2. Run `netlify dev` to proxy function routes when testing uploads locally, or hit the deployed preview environment for media operations.
3. Existing emulator workflows are unchanged; Firestore documents reference blob keys and do not store the raw image bytes.

