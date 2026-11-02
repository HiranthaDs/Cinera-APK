# CINERA — cinematic movie / TV catalog + player

A responsive, full-stack movie discovery portal inspired by the **layout patterns** of popular dark streaming sites. Independent branding; not an official HydraHD product.

## Screenshots

### Home

![Cinera home page](docs/screenshots/home-desktop.png)

### Movie catalog

![Cinera movie catalog](docs/screenshots/movies-desktop.png)

### Mobile

<p align="center">
  <img src="docs/screenshots/home-mobile.png" alt="Cinera mobile home page" width="390">
</p>

## Features

- Responsive cinematic landing page with featured hero slides
- Movies, TV, trending, top rated and popular sections
- TMDB-powered catalog, titles, ratings, artwork, cast, trailers and recommendations
- Movies and TV series discover pages with genre, release year, sorting and pagination
- Search titles, including movie and series results
- Detailed movie pages and TV seasons / episodes
- Watch page with multiple selectable source types (`iframe`, `video`, `hls`)
- Supports the publicly documented **Vidy embed API**, using TMDB IDs and season/episode selectors. Vidy is independent, with unverified title coverage and licensing.
- Add your own **licensed** MP4/HLS/iframe sources in `worker/sources.js`
- Cloudflare Worker API, edge-cached catalog responses and globally distributed static assets
- SPA route fallback, security headers and Cloudflare Workers observability
- Watchlist, recent titles and playback progress stored in browser localStorage, no login needed
- TMDB viewing-provider links where available
- Fallback demo catalog when TMDB credentials are not configured

## Requirements

Node.js **20.19+** (Node 22 recommended) and npm.

## Start locally

```bash
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars — fill TMDB_READ_ACCESS_TOKEN for the full catalog.
npm run dev
```

Open **http://localhost:5173**. On Windows PowerShell use `Copy-Item .dev.vars.example .dev.vars` instead of `cp`.

### Production preview

```bash
npm run build
npm run preview
```

The preview uses Cloudflare's local Workers runtime and serves the SPA and API together at **http://localhost:4173**.

## TMDB API

Create an API Read Access Token at <https://www.themoviedb.org/settings/api> and add it to `.dev.vars` for local development:

```env
TMDB_READ_ACCESS_TOKEN=your_token_here
ENABLE_VIDY=true
```

For Cloudflare production, store `TMDB_READ_ACCESS_TOKEN` as a Worker secret in **Settings → Variables and Secrets**. Never add it to `wrangler.jsonc` or frontend code. With no token, the Worker safely serves a small sample catalog.

For TMDB commercial use, review TMDB's terms. TMDB supplies **metadata and artwork**, **not video streaming rights or complete video files**.

## Playback providers

### Documented third-party embed

Vidy publishes these routes:

- `https://vidy.st/movie/{tmdbId}`
- `https://vidy.st/tv/{tmdbId}/{season}/{episode}`

The Worker creates the embed from numeric IDs using the documented `allow="encrypted-media; autoplay *; fullscreen *"` iframe permissions. Configure `ENABLE_VIDY=false` to disable it. Cinera does not scrape HydraHD, intercept protected streams, bypass paywalls/DRM, or promise that a given provider can play every movie. **Verify that you have rights to show content in your jurisdiction before public deployment.**

### Self-hosted / licensed streams

Edit `worker/sources.js`:

```js
export const playbackSources = {
  'movie:10378': [
    {
      id: 'licensed-file-1',
      label: 'My MP4 server',
      type: 'video',
      url: 'https://your-cdn.example.com/authorized-film.mp4',
    }
  ],
  'tv:1396': [
    {
      id: 'your-licensed-tv-source',
      label: 'My streaming provider',
      type: 'hls',
      url: 'https://your-cdn.example.com/playlist.m3u8',
    }
  ]
};
```

Note: the example TV entry above is illustrative; you must **have rights** to stream the title. For TV sources that differ by episode, use keys such as `tv:1396:1:1` (TMDB ID, season, episode). These episode-specific sources are combined with any generic `tv:1396` sources. Do not accidentally use a single TV playlist for every episode.

A playable Big Buck Bunny sample is included for testing. The sample is openly licensed; attribution to Blender Foundation.

If a video server blocks cross-origin requests or framing, fix its allowed origin/CORS/iframe headers **on the server that you control**; the Cinera frontend cannot bypass these protections.

## API routes

- `GET /api/health`
- `GET /api/home`
- `GET /api/search?q=...&page=1`
- `GET /api/genres/movie` / `GET /api/genres/tv`
- `GET /api/browse/movie?page=1&sort=popularity.desc&genre=28&year=2024`
- `GET /api/title/movie/157336`
- `GET /api/season/1396/1`
- `GET /api/sources/movie/157336`
- `GET /api/sources/tv/1396?season=1&episode=1`

## Deploy to Cloudflare Workers

### Wrangler CLI

```bash
npx wrangler login
npm run deploy
npx wrangler secret put TMDB_READ_ACCESS_TOKEN
```

The first deployment creates `cinera-movie-site` on your `workers.dev` subdomain. The secret command stores the TMDB token encrypted and deploys a new Worker version. Add a production custom domain under **Workers & Pages → cinera-movie-site → Settings → Domains & Routes**.

### Automatic GitHub deployments

Connect this repository under **Cloudflare Workers & Pages → Create → Import a repository**, then use:

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Add `TMDB_READ_ACCESS_TOKEN` as a **runtime secret** in the Worker's Variables and Secrets settings. `ENABLE_VIDY` defaults to `true` in `wrangler.jsonc` and can be overridden there or in the dashboard.

### Validation

```bash
npm run validate
```

This checks the Worker source, runs deterministic API tests, builds the optimized client and Worker bundles, validates static asset routing, and performs a Wrangler dry-run without deploying.

## Notes and limitations

- Movie catalog ≠ movie files. TMDB provides metadata only.
- Vidy is a separate external site. Its playback availability, uptime, advertising, safety and content licensing are not independently verified.
- Watch progress from third-party iframes works only if they send compatible messages from their documented origin. It is saved locally on the client.
- Saved lists are per browser/device (no cloud login).
- Do not use copyrighted logo artwork or pretend to be affiliated with HydraHD or TMDB.
