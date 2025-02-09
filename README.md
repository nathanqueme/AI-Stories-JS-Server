# Kids' Story Generation API

## Table of Contents
1. [Overview](#overview)  
2. [Live Demo](#live-demo-of-colorization)  
3. [4 Core Features](#4-core-features)  
4. [Libraries (NPM)](#libraries-npm)  
5. [Code References](#code-references)  

---

## 1. Overview
This API automatically crafts a multi-paragraph story for children from a single text prompt—complete with 10–20 illustrations, text-to-speech audio, and a 3D collectible (which also has a spinning GIF).

---

## 2. Live Demo of Colorization
You can see how illustrations can be re-colored at the [**Live Demo**](https://nq-portfolio.com/recoloring/demo).

---

## 3. Four Core Features

1. **GIF Processing**  
   - Converts frames into GIFs  
   - Removes backgrounds or overlays a watermark (similar to TikTok)  
   - Uses `omggif`, `gifencoder`, and `pngjs` under the hood

2. **Image Processing**  
   - Applies color tweaks, enhances contrast, handles transparency  
   - Leverages `jimp` and `canvas` for transformations

3. **Audio Processing**  
   - Merges multiple text-to-speech outputs into a single track  
   - Facilitated by Node.js built-ins

4. **Story Endpoint & NoSQL**  
   - CRUD operations (create, read, like, delete)  
   - Subscription checks (free vs. premium)  
   - Uses Firebase/Firestore or similar NoSQL solutions for data storage

---

## 4. Libraries (NPM)
- `jimp`
- `omggif`, `gifencoder`, `pngjs`
- `canvas`
- `axios`, `express`
- `aws-sdk` or similar for S3 integration
- `firebase-admin` or `@google-cloud/firestore` for NoSQL

---

## 5. Code References
- **Story Handler**: [`src/handlers/story/handler.ts`](./src/handlers/story/handler.ts)
- **GIF**: [`src/lib/gifProcessing.ts`](./src/lib/gifProcessing.ts)
- **Audio**: [`src/lib/audioProcessing.ts`](./src/lib/audioProcessing.ts)
- **Images**: [`src/lib/imageProcessing.ts`](./src/lib/imageProcessing.ts)
