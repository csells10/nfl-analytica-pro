# Add two branded email contact points (hello@gamelens.io)

Two plain `mailto:` links, no new endpoints, forms, dependencies, or API calls. No access behavior changes.

## 1. Public sign-in screen (`src/pages/Login.tsx`)

Beneath the existing sign-in controls (after the `authError` block), add:

- Line 1: `Want to try GameLens? Request access` — "Request access" is a link to
  `mailto:hello@gamelens.io?subject=GameLens%20Access%20Request`
- Line 2 (helper): `Opens your email app. Access requests are reviewed manually.`
- Line 3: `hello@gamelens.io` rendered as selectable text (`select-text`) so it can be copied.

The existing "Access is restricted to authorized accounts." note stays. The block renders in all sign-in variants (GIS and fallback button).

## 2. Authenticated app (`src/components/AppShell.tsx`)

The account dropdown already exists on desktop and mobile, so no footer is needed. Inside `DropdownMenuContent`:

- Add a `Help & feedback` item (`Mail` icon from lucide) as an anchor to
  `mailto:hello@gamelens.io?subject=GameLens%20Help%20%26%20Feedback`, placed with the Settings/Admin group.
- Add a small non-interactive row beneath it showing `hello@gamelens.io` as selectable text (muted, ~11px, `select-text`), so the address can be copied without opening mail.

Menu width is widened slightly (`w-44` → `w-56` if needed) so the address is not clipped.

## Styling (both placements)

- Reuse existing tokens only: `text-foreground` link text with `underline` (non-color cue) and `decoration-primary`, `hover:decoration-primary` strengthen, `focus-visible:ring-2 focus-visible:ring-ring`, `underline-offset-2`.
- Brand accent appears via the underline color and the `Mail` icon, not body text: light-mode `text-primary` measures ~4.2:1 on the white card, below 4.5:1, so body text stays `text-foreground` (passes everywhere); in dark mode the accent text would pass, but the same treatment is used for consistency.
- Link gets `inline-block py-1` (or equivalent padding) so the mobile tap target is comfortably large.
- No new palette, no layout redesign; surrounding spacing follows the card/menu rhythm.

## Tests (`src/test/contact-links.test.tsx`, new, reusing existing auth mocks)

1. Login renders the exact `mailto:hello@gamelens.io?subject=GameLens%20Access%20Request` href and helper text; address is selectable text.
2. AppShell dropdown renders the exact `mailto:hello@gamelens.io?subject=GameLens%20Help%20%26%20Feedback` href for a signed-in user; address row present.
3. Neither link element triggers API calls (plain anchors, no onClick handlers beyond default).

## Verification

- Focused tests + full suite, type check, production build.
- Playwright visual check: login page and opened account menu at desktop and mobile widths, light and dark; keyboard Tab reaches both links with a visible focus ring; no horizontal overflow.
- Contrast confirmed via computed colors against the real card/menu backgrounds in both themes.
- Confirm no network requests fire from the links (anchors only).

## Not changed

Authentication, allowlist, admin logic, API/backend, guides, loaders, navigation, date behavior. Nothing published or deployed.
