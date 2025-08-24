# FlightChord

空港をクリックして航空会社ごとの就航先を可視化する SPA (Single Page Application)。

## Features

- 🗺️ Interactive world map powered by MapLibre GL JS
- ✈️ Visualize flight routes with great circle arcs
- 🏷️ Filter by airlines and domestic/international routes
- 📊 Route frequency visualization with line thickness
- 🌍 Support for multiple airports worldwide

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Map**: MapLibre GL JS (Open-source vector tile maps)
- **Geometry**: Turf.js for great circle calculations
- **Testing**: Vitest (unit tests) + Playwright (E2E tests)
- **Deployment**: Cloudflare Pages

## Development

### Prerequisites

- Node.js 20+
- pnpm (via corepack)

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at http://localhost:5173

### Available Scripts

```bash
# Development
pnpm dev        # Start dev server
pnpm build      # Build for production
pnpm preview    # Preview production build

# Testing
pnpm test       # Run unit tests
pnpm test:ui    # Run tests with UI
pnpm e2e        # Run E2E tests with Playwright

# Code Quality
pnpm lint       # Run ESLint
```

## Project Structure

```
flightchord/
├── public/
│   └── data/
│       ├── airports.json          # Airport metadata (IATA, coordinates, etc.)
│       ├── airlines.json          # Airline information
│       └── airports/
│           └── HND.json          # Airport-specific route data
├── src/
│   ├── components/
│   │   ├── MapCanvas.tsx        # Map rendering component
│   │   └── Controls.tsx         # UI controls for filtering
│   ├── lib/
│   │   ├── types.ts            # TypeScript type definitions
│   │   ├── geo.ts              # Geographic calculations
│   │   ├── data.ts             # Data fetching utilities
│   │   └── filters.ts          # Route filtering logic
│   └── styles/
│       └── globals.css         # Global styles
├── e2e/
│   └── flightchord.spec.ts    # E2E test specifications
└── _headers                    # Cloudflare Pages headers config
```

## Data Format

### airports.json
```json
{
  "HND": {
    "iata": "HND",
    "icao": "RJTT",
    "name": "Tokyo Haneda",
    "lat": 35.5494,
    "lon": 139.7798,
    "iso_country": "JP",
    "city": "Tokyo"
  }
}
```

### airlines.json
```json
{
  "NH": {
    "iata": "NH",
    "icao": "ANA",
    "name": "All Nippon Airways"
  }
}
```

### Airport Route Index (e.g., HND.json)
```json
{
  "airport": "HND",
  "updatedAt": "2025-08-24",
  "carriers": {
    "NH": {
      "destinations": [
        { "iata": "CTS", "freq_per_day": 8, "intl": false }
      ]
    }
  }
}
```

## Deployment

### Cloudflare Pages

1. **Via GitHub Integration**:
   - Connect your GitHub repository to Cloudflare Pages
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Environment variables: None required

2. **Via Direct Upload**:
   ```bash
   pnpm build
   npx wrangler pages deploy dist --project-name=flightchord
   ```

### Cache Configuration

The `_headers` file configures caching for static JSON data:
- Airport and route data cached for 24 hours
- Reduces API calls and improves performance

## Future Enhancements

- 🌐 Real-time flight data integration
- 📱 Mobile-responsive design improvements
- 🎨 3D globe visualization option
- 📊 Advanced analytics and statistics
- 🔍 Search autocomplete with fuzzy matching
- 💾 User preferences and favorite routes
- 🚀 Performance optimizations for large datasets

## Data Sources & Attribution

- Airport data: [OurAirports](https://ourairports.com/) (CC0)
- Route data: [OpenFlights](https://openflights.org/) (ODbL)

When using this application with OpenFlights data, proper attribution must be provided according to ODbL license requirements.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.