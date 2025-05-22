// scripts/fetchImages.js
// Node.js script to fetch image URLs from Minecraft Wiki and output to a file
// Requires: npm install firebase-admin axios cheerio fs

const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// TODO: Set the path to your Firebase service account key JSON file
const serviceAccount = require('../service-account.json');

// TODO: Set your Firestore project ID if needed
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// DRY RUN mode: set to true to only log what would be updated, false to actually update Firestore
const DRY_RUN = false;

// Helper: Get the wiki URL for an item (customize as needed)
function getWikiUrl(item) {
  // Example: https://minecraft.fandom.com/wiki/Ancient_Debris
  // Use item.url if present, or construct from item.name
  if (item.url) return item.url;
  // Replace underscores with spaces and capitalize words
  const name = item.name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `https://minecraft.fandom.com/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`;
}

// Helper: Fetch and parse the first infobox image srcset URL
async function fetchInfoboxImageUrl(wikiUrl) {
  try {
    const { data } = await axios.get(wikiUrl);
    const $ = cheerio.load(data);
    const aside = $('aside');
    const img = aside.find('img').first();
    const srcset = img.attr('srcset');
    if (!srcset) return null;
    // Get the first URL in the srcset
    let firstUrl = srcset.split(',')[0].split(' ')[0];
    // Optionally transform the URL (e.g., remove query params)
    firstUrl = firstUrl.split('?')[0];
    // Replace '/268' with '/50' in the URL
    firstUrl = firstUrl.replace(/\/\d+$/, '/50');
    // Trim everything after .png (inclusive)
    const pngIndex = firstUrl.toLowerCase().indexOf('.png');
    if (pngIndex !== -1) {
      firstUrl = firstUrl.slice(0, pngIndex + 4);
    }
    return firstUrl;
  } catch (err) {
    return null;
  }
}

async function main() {
  const itemsSnapshot = await db.collection('items').get();
  let updated = 0, failed = 0;
  for (const doc of itemsSnapshot.docs) {
    const item = doc.data();
    // Only process items that do not already have an image
    if (item.image && item.image.trim() !== '') {
      continue;
    }
    const wikiUrl = getWikiUrl(item);
    const imageUrl = await fetchInfoboxImageUrl(wikiUrl);
    if (imageUrl) {
      try {
        if (DRY_RUN) {
          console.log(`[DRY RUN] Would update ${item.name} (${doc.id}) with image: ${imageUrl} and url: ${wikiUrl}`);
        } else {
          await db.collection('items').doc(doc.id).update({ image: imageUrl, url: wikiUrl });
          updated++;
          console.log(`Updated ${item.name} (${doc.id}) with image: ${imageUrl} and url: ${wikiUrl}`);
        }
      } catch (e) {
        failed++;
        console.error(`Failed to update ${item.name} (${doc.id}):`, e.message);
      }
    } else {
      console.log(`${item.name}: No image found`);
    }
  }
  console.log(`\nUpdate complete. Updated: ${updated}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 