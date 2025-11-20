# Netlify Blobs Media Management Spec

## Overview
This spec describes how to decouple image storage from the repo by using **Netlify Blobs** for uploads and **Netlify Image CDN** for serving transformed images. It removes the need to redeploy the site when adding or updating item images.

---

## Goals
- Store all item images in Netlify Blobs instead of `public/images/items`.
- Allow authorized users (admin) to upload, replace, and delete images via a simple admin UI.
- Continue using Netlify’s Image CDN for on-the-fly transforms and caching.
- Maintain existing paths (e.g. `items/{category}/{version}/{slug}.webp`).

---

## Storage Structure
```
items/
  wood/1.21/oak_log.webp
  ores/1.21/iron_ore.webp
  food/1.21/apple.webp
```
Approx. total size: **26 MB** — minimal cost under Netlify’s free tier.

---

## Configuration

### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[blobs]]
  id = "media"
```

---

## API Endpoints

### Upload
`netlify/functions/upload-items.js`
```js
import { blobs } from '@netlify/blobs';

export const config = { path: "/api/upload-items" };

export default async (req) => {
	if (req.headers.get('x-admin-media-key') !== process.env.ADMIN_MEDIA_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const path = form.get('path');

  if (!file || !path) return new Response('Bad Request', { status: 400 });

  const store = blobs.getStore('media');
  await store.set(path, file.stream(), {
    contentType: file.type || 'application/octet-stream',
    access: 'public'
  });

  const publicUrl = await store.getPublicUrl(path);
  return Response.json({ ok: true, url: publicUrl, path });
};
```

### Delete
`netlify/functions/delete-item.js`
```js
import { blobs } from '@netlify/blobs';

export const config = { path: "/api/delete-item" };

export default async (req) => {
	if (req.headers.get('x-admin-media-key') !== process.env.ADMIN_MEDIA_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { path } = await req.json();
  if (!path) return new Response('Missing path', { status: 400 });

  const store = blobs.getStore('media');
  await store.delete(path);

  return Response.json({ ok: true, deleted: path });
};
```

---

## Frontend Integration

### Upload Example
```ts
const fd = new FormData();
fd.append('file', file);
fd.append('path', `items/${category}/${version}/${slug}.webp`);

const res = await fetch('/api/upload-items', {
  method: 'POST',
	headers: { 'x-admin-media-key': import.meta.env.VITE_ADMIN_MEDIA_KEY },
  body: fd
});

const { url } = await res.json();
// Save this URL in your item metadata
```

### Delete Example
```ts
await fetch('/api/delete-item', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
		'x-admin-media-key': import.meta.env.VITE_ADMIN_MEDIA_KEY
  },
  body: JSON.stringify({ path: item.path })
});
```

---

## Image Delivery
Continue serving images through the **Netlify Image CDN**:
```html
<img
  src={`/.netlify/images?url=${encodeURIComponent(item.imageUrl)}&w=256&fm=webp`}
  loading="lazy"
  decoding="async"
  alt="Oak Log"
/>
```

---

## Admin UI (Optional)
A minimal `/admin/media` page for:
- Drag-drop upload
- Browse existing items
- Replace and delete images
- Copy public URLs

**Data stored per image:**
```json
{
  "url": "https://your-site.netlify.app/.netlify/blob/...",
  "path": "items/wood/1.21/oak_log.webp",
  "category": "wood",
  "version": "1.21",
  "alt": "Oak Log",
  "w": 256,
  "h": 256
}
```

---

## Costs
- **Storage:** <30 MB → $0/month (far below any paid threshold)
- **Image CDN:** Free under normal usage; counted as standard CDN bandwidth
- **Functions:** Negligible cost (admin-only access)

---

## Summary
✅ Upload, list, and delete images without redeploys  
✅ Public read, admin-only write  
✅ Still uses Netlify’s image transforms and CDN  
✅ Zero additional infrastructure or cost for current scale
