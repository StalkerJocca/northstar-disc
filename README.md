# Northstar DISC

Northstar DISC is a polished, web-based DISC assessment experience designed for leaders, teams, and professionals who want a thoughtful reflection of their behavioral style. The app combines an elegant assessment flow, premium results visualization, and social sharing features so users can explore their profile and share it with confidence.

## Overview

This project delivers a complete front-end experience for a DISC personality assessment with:

- a guided 50-question journey
- animated progress and milestone feedback
- a premium results dashboard
- share-ready profile cards
- LinkedIn/X-friendly sharing and export options
- browser persistence so users do not lose progress on refresh

## Key Features

- Guided assessment flow with clear, human-friendly prompts
- Local persistence through browser storage to resume progress safely
- Premium progress UI with milestone celebration states
- Rich results experience with narrative summaries, trait insights, and KPI-style highlights
- Shareable profile card designed for social distribution
- PNG/PDF export support for the results card
- Referral-aware share links and share event tracking hooks for growth measurement
- SEO and social metadata support for preview cards on LinkedIn and other platforms

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Recharts
- Vitest + Testing Library

## Project Structure

```text
src/
  components/          # Reusable UI sections and visual components
  lib/                 # Assessment logic, scoring helpers, share utilities, and content
  api/                 # DISC score submission logic
  types/               # Shared TypeScript models
  test/                # Global test setup
public/                # Static assets, including social preview image
```

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm or pnpm

### Installation

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open the local Vite URL in your browser.

## Available Scripts

```bash
npm run dev      # start the development server
npm run build    # create a production build
npm test         # run the test suite
npm run preview  # preview the production build locally
```

## Testing

The project uses Vitest and Testing Library for regression and UI-focused tests.

```bash
npm test
```

## Deployment

The application is designed to be deployed on Vercel or any modern static hosting platform.

Recommended deployment flow:

1. Connect the repository to your hosting provider.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Deploy from the main branch.

## Product Notes

- The experience is intentionally optimized for clarity, elegance, and sharing.
- The final results page is designed to feel premium and executive, not purely academic.
- Social sharing is intentionally lightweight and easy to use without requiring a backend dependency.

## Contributing

Contributions are welcome. If you would like to improve the experience, please open an issue or submit a pull request with a clear description of the change.

## License

This project is currently maintained for internal product and portfolio use. Please contact the maintainers before using it in a commercial setting beyond the intended scope.
