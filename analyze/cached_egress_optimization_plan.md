# Cached Egress Optimization Plan (Supabase Storage)

## Objective
Reduce Supabase **Cached Egress** usage (CDN cache hits) by decreasing total bytes served from Storage, primarily for:
- `image-bucket/tours/*`
- `routes/covers/*`
- `avatars/*`

Target:
- Bring monthly cached egress comfortably below quota (Free plan: 5 GB cached).
- Reduce daily spikes by eliminating unnecessary re-downloads and oversized assets.

## Context (What cached egress is)
Supabase cached egress is traffic served from Supabase CDN via **cache hits** (commonly Storage + Smart CDN). It has **separate quota** from uncached egress.

## Evidence (Dashboard)
From Supabase Storage reports / logs shared:
- Most requested paths are Storage GETs under `image-bucket/tours/*` and `routes/covers/*`.
- Frequent `304` responses indicate clients are revalidating often (weak client-side caching).

## Codebase Findings (Current)
### 1) Storage uploads do not set `cacheControl`
Uploads observed without `cacheControl`:
- `lib/tourService.ts` → `supabase.storage.from('image-bucket').upload(...)`
- `lib/routeService.ts` → `supabase.storage.from('routes').upload(...)`
- `components/sheets/CreatePostSheet.tsx` → `supabase.storage.from('community').upload(...)`
- `lib/avatarService.ts` → `supabase.storage.from('avatars').upload(...)`

Impact:
- Browser/device caching is not controlled explicitly.
- Revalidation and re-downloads are more likely.

### 2) Avatar URLs force cache-busting on every update
`lib/avatarService.ts` appends `?t=${Date.now()}` to the public URL.

Impact:
- Every avatar update produces a brand new URL, bypassing client cache.
- If avatar is rendered across multiple screens/sessions, it increases repeated downloads.

### 3) Aggressive image prefetch
Prefetch is used in:
- `app/(tabs)/explore.tsx`
  - Prefetch first 10 tour images when `tours` changes
  - Prefetch all highlighted route cover images when `highlightedRoutes` changes
- `components/sheets/TourDetailSheet.tsx`
  - Prefetch related tours’ images when detail is visible

Impact:
- Prefetching can increase cached egress because it downloads images even when the user never views them.
- Combined with large image sizes, it can create daily spikes.

### 4) Image caching relies on React Native built-in behavior
`components/ui/CachedImage.tsx` uses `Animated.Image` with `source.cache` policy.

Risk:
- React Native’s default caching differs by platform and is not always persistent across sessions.
- `Image.prefetch` may fill memory cache but does not guarantee long-term disk caching.

## Measurement Plan (Before/After)
### A) Identify top contributors
In Supabase Dashboard:
- Reports → Storage → **Top Routes** (Top 20)
- Reports → Storage → **Network Traffic**
- Reports → Storage → **Request Caching** (hit/miss)

### B) Confirm headers and file sizes
For top 5 assets (from Top Routes):
- Check headers:
  - `curl -I "https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>"`
- Record:
  - `cache-control`
  - `content-type`
  - `content-length`

### C) Success metrics
Track weekly:
- Cached egress (GB/day and GB/month)
- Top Routes: request counts for `tours/*` and `covers/*`
- Median image size (KB) for tour images and route covers

## Implementation Plan

### Phase 0 — Quick safety switches (same day)
1) **Reduce/limit prefetch** to avoid speculative downloads.
   - `app/(tabs)/explore.tsx`
     - Reduce from 10 to 3 (or disable on cellular / low-data mode)
     - Prefetch only images currently visible on screen (if list virtualization available)
   - `components/sheets/TourDetailSheet.tsx`
     - Prefetch only the next 1–2 related tours or disable

Acceptance:
- Cached egress daily spikes decrease immediately.

### Phase 1 — Enable long-lived client caching for public assets (1–2 days)
2) **Set `cacheControl` on uploads** (public images that rarely change)

Recommended policy (public, immutable content):
- `cacheControl: 'public, max-age=31536000, immutable'`

Apply to:
- `lib/tourService.ts` (tour images)
- `lib/routeService.ts` (route covers and stop images)
- `components/sheets/CreatePostSheet.tsx` (community images, if acceptable)

Notes:
- This primarily improves **device/browser caching** (reduces re-download frequency).
- For content that may change at same path, use versioned filenames (see Phase 2).

Acceptance:
- `curl -I` shows updated `cache-control` on new uploads.
- Reduced `304` frequency and repeat GETs per user session.

### Phase 2 — URL stability + proper cache-busting (2–4 days)
3) **Remove time-based cache-busting for avatars**

Current:
- Avatar URL is `.../avatar.jpg?t=<timestamp>`.

Change strategy:
- Use one of:
  - **Versioned filename**: `avatars/<userId>/avatar_<unix>.jpg` and store the new URL in profile.
  - Or keep stable filename but only append a version when it changes (e.g. `?v=<profile.updated_at>`), not `Date.now()`.

Acceptance:
- Avatar URL is stable between renders/sessions.
- Avatar downloads drop in logs.

### Phase 3 — Reduce bytes served: thumbnails + consistent sizes (1–2 weeks)
4) **Introduce thumbnails for list cards**

Problem:
- Tour list/map previews likely use the same full-size `tour.image`.

Solution:
- Store two URLs per tour:
  - `image_full`
  - `image_thumb` (e.g. ~400px wide, 50–150KB target)
- Use `image_thumb` in:
  - `explore.tsx` tour list and preview cards
  - any feed/list cards

Implementation options:
- Client-side create thumbnails during upload (Expo ImageManipulator) and upload both.
- Or server-side pipeline (Edge Function) to generate and store thumbnails.

Acceptance:
- Median bytes per tour image request drops significantly.
- Cached egress drops even if request counts remain similar.

5) **Standardize formats**
- Prefer WebP where feasible (or JPEG with controlled quality) for mobile.

Acceptance:
- Reduced average `content-length`.

### Phase 4 — Improve RN image caching durability (optional, 1 week)
6) **Adopt a dedicated image component with disk cache**

Options:
- `expo-image` (good caching behavior on Expo)

Steps:
- Replace hot paths using many images (tour list, route list, avatars).
- Configure cache policy to use disk cache.

Acceptance:
- Repeat opens of the app do not re-download the same images.

## Risk & Rollout
- Roll out Phase 0 and Phase 1 first (low risk).
- Phase 2 changes avatar URLs → ensure profile update flow works and old URLs do not break.
- Phase 3 introduces schema changes (two URLs) → requires DB migration and app updates.

## Checklist (PR-by-PR)
### PR1: Prefetch reduction
- Update `explore.tsx` and `TourDetailSheet.tsx` prefetch behavior.
- Add a feature flag / config constant for prefetch counts.

### PR2: Add cacheControl to uploads
- Update upload calls in:
  - `lib/tourService.ts`
  - `lib/routeService.ts`
  - `components/sheets/CreatePostSheet.tsx`
  - `lib/avatarService.ts`

### PR3: Avatar cache-busting fix
- Replace `?t=Date.now()` with versioned approach.
- Update profile update logic accordingly.

### PR4: Thumbnails (largest impact)
- Add DB columns or JSON fields for `image_thumb`.
- Upload pipeline stores both sizes.
- Update UI components to use thumbnails in lists.

## Notes for Supabase Debugging
- Use Storage report “Top Routes” to select the top 5 objects.
- Multiply request count × file size to estimate contribution.
- After each PR, compare:
  - cached egress per day
  - request counts for the same top routes

