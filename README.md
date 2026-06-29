# Ujjain Route Map

A static, interactive route map for a short Ujjain temple circuit. The site shows seven key stops, route legs, walking/driving segments, live Google Maps links, and a side panel for quickly following the route point by point.

## Features

- Interactive Leaflet map with street, OSM, and satellite layers.
- Seven numbered route stops with popups and Google Maps links.
- Route leg cards with mode, distance, approximate time, and per-leg navigation links.
- Full-route Google Maps link with waypoints.
- Current-location button that shows the nearest route stop when browser location permission is allowed.
- Reset button to return the map to the full route view.
- Responsive layout for desktop and mobile screens.

## Route Stops

1. Ujjain Junction
2. Mahakaleshwar Jyotirlinga
3. Mahakal Lok Corridor
4. Harsiddhi Mata Temple
5. Kal Bhairav Temple
6. Mangalnath Mandir
7. Ram Ghat

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Leaflet for the interactive map
- OpenStreetMap, CARTO, and Esri map tiles
- Lucide icons from CDN
- Precomputed route geometry stored in `route-data.js`

## Project Structure

```text
.
├── index.html       # Main page markup and external CDN links
├── styles.css       # App layout, map controls, panels, pins, and responsive styles
├── app.js           # Leaflet setup, route rendering, interactions, and geolocation
├── route-data.js    # Stops, route legs, geometry, distances, times, and map links
└── README.md
```

## Run Locally

This project does not need a build step or npm packages. It can be opened directly in a browser, but running it through a local server is better for location permissions and browser behavior.

Using Python:

```powershell
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

You can also use any static server, such as VS Code Live Server.

## Editing Route Data

Most route content is in `route-data.js`.

- Update `places` to change stop names, coordinates, or individual Google Maps links.
- Update `legs` to change route segments, mode, distance, time, geometry, or per-leg Google Maps links.
- Update `googleFullRouteUrl` to change the full route button.

The map reads this file through `window.UJJAIN_ROUTE_DATA`, so keep that global object name unchanged unless you also update `app.js`.

## Data Notes

Route geometry is precomputed and does not call a routing API at runtime. Map tiles and CDN assets require an internet connection. Travel times and routes can change, so confirm important trips in Google Maps before relying on the route.

## Deployment

Because this is a static site, it can be deployed on GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static file host. Deploy the root folder as-is.

## Credits

- Map rendering: [Leaflet](https://leafletjs.com/)
- Map data: [OpenStreetMap](https://www.openstreetmap.org/)
- Route geometry source: [OSRM](https://project-osrm.org/)
- Icons: [Lucide](https://lucide.dev/)
