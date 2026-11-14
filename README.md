<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/10d307e4-ef59-4bb6-9d93-8077dc5aa336

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backup and cross-tab writes

Protected LocalStorage writes use the shared write gate. Restore and staging/rollback hold the exclusive Web Locks lock and a verified LocalStorage marker for the full operation; ordinary synchronous writes check that marker before writing. Browsers without Web Locks fail closed for protected writes. This coordination covers the app's listed LocalStorage writers, not manual DevTools edits, older app versions, or other same-origin scripts that ignore the gate.

Encrypted backups can be kept in the browser's append-only IndexedDB archive or downloaded as JSON. Archive entries have unique IDs, timestamps, schema versions, and SHA-256 checksums; they are not automatically replaced or deleted. Download names include a UUID, but the browser controls the download folder and the app cannot guarantee where the file is saved. Browser storage may be cleared or evicted, so keep an exported copy separately when needed.
