# 栖境 · Micro Worlds

Three.js interactive web experience with three animated scenes:

- 山间神社 / Forest Sanctuary
- 樱花车站 / Sakura Platform
- 海上聚落 / Floating Settlement

## Local preview

```bash
npm install
npm run dev
```

Open `http://localhost:3000/` in a WebGL 2 capable browser.

The viewer supports scene switching, day/night lighting, near/far camera presets, orbit controls, zoom, fullscreen, and animation pause/play. The water scene uses the optimized `water-v03.glb` export from `Water_Fortress_DetailFilm.blend`.

## Checks

```bash
npx tsc --noEmit
npm run build
node --experimental-strip-types scripts/verify-scene-details.mjs
node scripts/verify-water-v03.mjs
```
