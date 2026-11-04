# Project memory

## Product intent & audience

- Web app for tracking TV series with calendar, platform filtering, and user accounts
- Spanish-language UI; content focuses on Spanish TV platforms and networks
- Admin role (specific email account) manages series data, views user registrations and suggestion mailbox; regular users browse, track, and customize profiles
- PWA installable on PC, mobile, and tablet

## Brand personality & voice

- Production-quality, non-cookie-cutter design (per `.bolt/prompt`)
- Spanish-language interface throughout
- Pastel color palette with light/dark mode toggle (preserved from original design)

## Visual design & UX direction

- Stack: Vite + React (JSX), Tailwind CSS, Lucide React icons (per `.bolt/prompt`); original used Font Awesome — migration in progress
- `@/` path alias maps to `src/` (per `.bolt/prompt`)
- Original design: pastel palette, day/night mode, modal-based admin panel with tabs (users, suggestions, series, texts)
- Views adapted: header (with dark mode persistence), catalog home, calendar, platforms, Mi Lista, suggestions, series modal, account forms, install sheet, admin panel
- Profile avatars use TV character images instead of random photos
- Admin panel: 3 tabs — user registrations, suggestion mailbox, series management with per-row edit (pencil button → series detail → Edit info for title, synopsis, platforms)
- PWA: manifest, service worker, SVG icon — needs PNG icon for iOS/iPadOS
- **Catalog cards (home):** poster/cover fills top of card; platform badge top-left, "Mi Lista" bookmark icon top-right; below in white area: title, genre, rating (left), status in capsule (right)
- **Series detail card:** status inline with title; below — genre, premiere date, original network, runtime; then a strip showing US air date and Spain air date; rating next to "Mi Lista" button

## Decisions, constraints & rationale

- User explicitly requested preserving original app colors and structure; pastel palette and light/dark mode retained across all components
- Admin account identified by exact email `flarrowandmoreweb@gmail.com`; must be registered to activate admin features and panel visibility
- Admin access only shows when the designated email exists in the database with admin permissions — previously appeared "missing" because account wasn't registered
- Calendar must reflect real series end dates and auto-update daily
- Platform/network filtering fixed to return all matching series, not just one
- Build and typecheck pass; verification done by code review only, not browser testing
- Dark mode preference now persists across page reloads
- TVMaze used as data source; Spanish synopses and Spanish platforms not fully verified
- Catalog card and series detail layouts updated to match user-provided screenshots; series detail now includes premiere date (`fecha de estreno`) and original network (`cadena original`) as user requested

## Open questions & assumptions

- Admin account not yet created in database — user must register with the designated email to see admin panel
- Real browser testing still pending for all views, admin panel, calendar, platform filtering, PWA install flows, and newly updated card/detail layouts
- Pixel-by-pixel comparison with original design and with user screenshots not done; visual review in browser recommended
- iOS icon: SVG may not display correctly; PNG icon should be added
- Some Spanish synopses and Spanish platform data remain unverified against TVMaze
- Daily auto-update mechanism needs confirmation that it works in production