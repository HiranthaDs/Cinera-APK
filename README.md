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
- Add your own **licensed** MP4/HLS/iframe sources in `server/data/sources.json`
- Watchlist, recent titles and playback progress stored in browser localStorage, no login needed
- TMDB viewing-provider links where available
- Fallback demo catalog when TMDB credentials are not configured

## Requirements

Node.js **20+** (Node 22 recommended), npm.

## Start locally

```bash
npm install
cp .env.example .env
# Edit .env — fill TMDB_READ_ACCESS_TOKEN for the full catalog.
npm run dev
```

Open **http://localhost:5173**. On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp` if desired.

### Production

```bash
npm run build
npm start
```

Visit **http://localhost:3001**. Configure `PORT` via the environment if your hosting provider specifies one. A Dockerfile is included.

## TMDB API

Create an API Read Access Token at <https://www.themoviedb.org/settings/api> and add to `.env`:

```env
TMDB_READ_ACCESS_TOKEN=your_token_here
ENABLE_VIDY=true
PORT=3001
```

The access token stays on the Express server and is **never placed into the browser bundle**. With no token, a small sample catalog is shown instead of misrepresenting it as every movie.

For TMDB commercial use, review TMDB's terms. TMDB supplies **metadata and artwork**, **not video streaming rights or complete video files**.

## Playback providers

### Documented third-party embed

Vidy publishes these routes:

- `https://vidy.st/movie/{tmdbId}`
- `https://vidy.st/tv/{tmdbId}/{season}/{episode}`

The server creates the embed from numeric IDs using the documented `allow="encrypted-media; autoplay *; fullscreen *"` iframe permissions. Configure `ENABLE_VIDY=false` to disable it. Cinera does not scrape HydraHD, intercept protected streams, bypass paywalls/DRM, or promise that a given provider can play every movie. **Verify that you have rights to show content in your jurisdiction before public deployment.**

### Self-hosted / licensed streams

Edit `server/data/sources.json`:

```json
{
  "movie:10378": [
    {
      "id": "licensed-file-1",
      "label": "My MP4 server",
      "type": "video",
      "url": "https://your-cdn.example.com/authorized-film.mp4",
      "note": "Authorized distribution"
    }
  ],
  "tv:1396": [
    {
      "id": "your-licensed-tv-source",
      "label": "My streaming provider",
      "type": "hls",
      "url": "https://your-cdn.example.com/playlist.m3u8"
    }
  ]
}
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

## Deploy

Use any Node.js service (Render, Railway, Fly.io, VPS, Docker). Set Build Command `npm install && npm run build`, Start Command `npm start`. Set `TMDB_READ_ACCESS_TOKEN`, `ENABLE_VIDY` and `PORT` through the host's secret settings. A static-only deployment will NOT serve the API; a backend deployment is required.

## Notes and limitations

- Movie catalog ≠ movie files. TMDB provides metadata only.
- Vidy is a separate external site. Its playback availability, uptime, advertising, safety and content licensing are not independently verified.
- Watch progress from third-party iframes works only if they send compatible messages from their documented origin. It is saved locally on the client.
- Saved lists are per browser/device (no cloud login).
- Do not use copyrighted logo artwork or pretend to be affiliated with HydraHD or TMDB.
