# LOOKBOOK

**Find your style. Make it yours.**

A premium fashion discovery platform inspired by Pinterest's visual discovery, focused entirely on fashion. Discover outfits, save inspiration, build your style profile, and find similar products.

## Features

- **Visual Discovery** — Pinterest-style masonry grid with editorial aesthetics
- **Explore & Search** — Filter by style, occasion, season, color, budget (INR)
- **Outfit Detail** — Style breakdown with detected pieces
- **Save & Boards** — Pinterest-inspired boards for organizing looks
- **Style Profile** — Your Style DNA with preferences and distribution
- **See It On Me** — Profile onboarding for fit recommendations (mock MVP)
- **Fit Analysis** — Deterministic fit scoring (not real virtual try-on)
- **Find This Look** — Similar product recommendations by category
- **Trending** — Editorial-style trend analytics
- **Dark Mode** — Light (default) and dark themes

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- next-themes
- Local storage for user state (MVP)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/           # Pages and routes
components/    # UI and fashion components
data/          # Mock data layer (images, outfits, products)
lib/           # Utilities, analytics, constants
services/      # Business logic (outfit, product, user, recommendation)
types/         # TypeScript interfaces
```

## Architecture Notes

- **Mock data** is isolated in `data/` for easy replacement
- **Recommendation engine** in `services/recommendation-service.ts` is deterministic
- **Fit analysis** is clearly separated as mock — not real AI
- **Analytics** uses an abstraction layer in `lib/analytics.ts`
- Future: Supabase, real auth, AI vision, vector search, affiliate links

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## License

Private — demo/development use.
