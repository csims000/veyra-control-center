# VEYRA — Personal Control Center

VEYRA is a responsive, dark-first personal workspace with a navy/black interface, blue and cyan accents, a sidebar, dashboard panels, and a collection of personal tools.

## Project structure

- `index.html` — application shell and page structure
- `assets/veyra.css` — styles and responsive visual system
- `assets/veyra-auth.js` — Supabase authentication flow
- `assets/veyra-app.js` — dashboard, pages, local workspace, and cloud sync
- `assets/veyra-effects.js` — lightweight animated background effects

The app is intentionally kept build-tool-free so it can be hosted on a free static host without a paid build service.

## Run locally

Open `index.html` in a modern browser. Authentication and cloud sync require an internet connection and the configured Supabase project.

## Data and privacy

- The browser client uses a Supabase **publishable** key. Never place a Supabase secret or service-role key in browser code.
- User workspace records are stored in `public.user_workspace`; profiles are stored in `public.profiles`.
- Both tables have Row Level Security enabled. The current policies restrict authenticated users to rows whose owner ID matches `auth.uid()`.
- Local browser storage is used for cached workspace data. It is not a secure vault; do not store passwords, private keys, or other highly sensitive information in notes.
- Profile images and wallpapers are accepted only as bounded raster image data URLs before being inserted into the page or CSS.
- Cloud sync requires a working internet connection and valid Supabase permissions.

## Security notes

The client-side publishable key is expected to be visible. Security depends on Supabase Auth and database RLS, not on hiding that key. Keep authorization rules in the database and never trust browser-side role checks.

Supabase's Security Advisor currently reports that leaked-password protection is disabled. Enable it in the Supabase Auth password security settings when available for this project. This setting cannot be enabled safely by changing frontend code.

## Validation

The GitHub Actions workflow checks JavaScript syntax and verifies that the HTML shell references the split assets. No package installation or paid service is required.

## Hosting

Deploy the repository root as a static site. Keep the output directory at the repository root and do not add a build command. The project itself does not require a paid domain or paid service.
