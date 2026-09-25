# Redesign Audit: النشاط الثقافي (Al-Nashat)

**Scope:** full design review of the public site, the student portal, the projector display, and the admin panel.
**Goal:** a cleaner, more premium result that keeps the identity: the wordmark, green/gold/ivory palette, Readex Pro + Reem Kufi, the Islamic geometric pattern, and the calm, proud "school-honours" personality.
**Status:** review only. No application files were changed. This document is the only file added.

---

## 0. How this was audited

- **Code:** every page, layout, shared component, `index.css` tokens, `index.html`, and the build output.
- **Real browser:** the app ran locally (Vite) in Chromium through Playwright. I took **72 screenshots** covering every public route, every admin route, the projector display, and interaction states (open accordion, "More" sheet, keyboard focus), at **desktop 1440×900, tablet 834×1112, and mobile 390×844**. The display was also shot at **1920×1080 and 1280×720**.
- **Data:**
  - This environment's network policy blocks the site's Supabase host (`bjcnyecnffdscoyaozic.supabase.co`), so the browser could not reach it directly.
  - I read the real configuration from the project read-only (groups, colours, rules, badges, categories, homepage content, season, settings) and served it to the browser through request interception.
  - The live database currently holds **1 member, 3 log entries and 1 post**. I shot the key pages twice: **"live"** (the real, near-empty state) and **"demo"** (24 synthetic students, 26 log events, 4 posts; news images replaced by gradient placeholders) to judge the design as it will look during the season.
  - Admin pages used a mocked owner session.
- **Fonts:** Google Fonts was served locally to Chromium. All screenshots show the real Readex Pro / Reem Kufi rendering.
- **Automated checks per page:** horizontal overflow, icon-only controls without accessible names, tap targets under 32 px, and console/page errors. WCAG contrast ratios were computed for the key colour pairs.
- **Skills:** the four skills you named (`redesign-existing-projects`, `design-taste-frontend`, `high-end-visual-design`, `web-design-guidelines`) are **not installed in this environment**, so I could not load them. I applied their standard criteria directly: an audit-then-plan method, anti-"AI template" taste rules, premium visual hierarchy, and the Web Interface Guidelines for a11y/UX. Re-running against the skills themselves once they are installed is a good sanity check.

---

## 1. Understanding the site

### Stack
| Layer | Tech |
|---|---|
| UI | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS 4 (`@theme` tokens in `src/index.css`), a few `@layer components` classes (`.card`, `.field`, `.label`, `.gold-text`, `.islamic-pattern(-dark)`) |
| Motion | `motion` (Framer Motion v12 API): springs, `layoutId` indicators, `AnimatePresence` |
| Icons | `lucide-react` |
| Data | Supabase (Postgres, Realtime, Auth, Storage, Edge Functions); all points logic in atomic RPCs |
| Other | `recharts` (reports), `exceljs` (import/export), `html5-qrcode` (scanner), `qrcode`, `react-easy-crop`, `browser-image-compression` |
| Deploy | Vercel SPA rewrite |

### RTL / Arabic
Fully Arabic and RTL (`<html lang="ar" dir="rtl">`). Dates are Hijri (Umm al-Qura formatting), numbers are Latin digits with tabular figures, and directional icons are mirrored correctly (ArrowLeft means "forward"). Logical properties are mostly used (`text-start`), with a few physical `right-*`/`left-*` values that happen to be correct because the site is RTL-only.

### Routes
| Route | Layout | Page |
|---|---|---|
| `/` | Public | Home: hero, live ticker, group standings (currently **hidden** by `show_groups: false`), news |
| `/leaderboard` | Public | Podium, group accordion, overall ranking with search, live list (desktop only) |
| `/log` | Public | Public points log, filter by group and type, grouped by Hijri day |
| `/rules` | Public | Tabs: earn / violations and cards / badges |
| `/news`, `/news/:id` | Public | Category chips, list, article |
| `/me` | Public | Student portal: phone or QR login, then profile, attendance, badges, history |
| `*` | Public | 404 |
| `/display` | None | Projector mode, full screen |
| `/admin/login` | None | Supervisor login |
| `/admin` | Admin | Dashboard |
| `/admin/attendance`, `/scan`, `/logs`, `/reports` | Admin | Operations (supervisors and owner) |
| `/admin/members`, `/seasons`, `/groups`, `/rules`, `/badges`, `/content`, `/cards`, `/settings` | Admin | Owner only |

### Shared components
- **Layout:** `PublicLayout` (sticky header, desktop nav, footer, mobile `BottomNav` and `MoreSheet`), `AdminLayout` (dark patterned sidebar at ≥lg, `BottomNav` and `MoreSheet` below lg), `Brand` (wordmark), `RouteErrorBoundary`
- **UI:** `Button` (7 variants × 4 sizes), `Input`/`Textarea`/`Select`/`Toggle` (`Field.tsx`), `Modal` (bottom sheet on mobile), `FeedbackProvider` (toasts and confirm dialog), `misc.tsx` (`PageHeader`, `StatCard`, `EmptyState`, `Skeleton`, `Spinner`, `Chip`, `GroupDot`, `LeaderBadge`, `BadgeMedal`, `CardsIndicator`)
- **Domain:** `Podium`, `GroupStandings`, `LiveTicker`/`LiveList`, `LogList` (+ `LOG_TYPES` colour map), `PostCard`/`FeaturePostCard`, `MemberIdCard`, `QRCode`, `Scanner`, `MemberPanel`, `ImageCropper`

### Current design tokens (exact values from `src/index.css`)

**Fonts**
- `--font-sans`: **Readex Pro** (300/400/500/600/700 loaded; 300 is never used)
- `--font-display`: **Reem Kufi** (500/600/700 loaded; used only for the wordmark and hero/display titles, 9 usages)
- Root size: **15px** below 640px, **16px** above

**Neutrals**
| Token | Value |
|---|---|
| `ink` | `#16202b` |
| `muted` | `#5f6b76` |
| `ivory` (page bg) | `#faf7f0` |
| `sand` | `#f2ecdf` |
| `line` | `#e6dcc6` |

**Primary: green**
| 50 | 100 | 200 | 300 | 400 | 500 | 600 | **700 (brand)** | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| `#eef6f2` | `#d5eadf` | `#a9d3bf` | `#74b59a` | `#3f9273` | `#1f7358` | `#155f48` | **`#0f4c3a`** | `#0b3b2d` | `#072820` |

**Gold**
| 50 | 100 | 200 | 300 | **400 (brand)** | 500 | 600 |
|---|---|---|---|---|---|---|
| `#fbf6ea` | `#f5e9c9` | `#ead39a` | `#dcb96b` | **`#c9a24b`** | `#b08637` | `#8e6a2b` |

**Semantic (declared but mostly unused)**
- `success #15803d`, `danger #b42335`, `warning #d4a012`
- The code uses raw Tailwind colours instead: red-600 ×27, red-50 ×20, emerald ×~30, plus amber, sky, violet, teal, rose, slate, yellow and orange.

**Data colours (from the database):** groups الصفاء `#0F6B55`, العطاء `#9B2242`, الإخاء `#1F5A96`, النقاء `#B7791F`; categories خبر `#1F5A96`, فعالية `#0F6B55`.

**Shadows**
- `--shadow-soft`: `0 1px 2px rgb(22 32 43/.04), 0 4px 16px -8px rgb(22 32 43/.08)`
- `--shadow-lift`: `0 2px 4px rgb(22 32 43/.05), 0 18px 40px -12px rgb(15 76 58/.25)`
- `--shadow-gold`: `0 0 0 1px rgb(201 162 75/.35), 0 12px 30px -10px rgb(201 162 75/.45)`
- Ad-hoc usage alongside these: `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-2xl`, and inline `shadow-[…]`

**Radius:** no tokens. In use: `rounded-full` ×73, `xl` ×45, `2xl` ×39, `lg` ×23, `3xl` ×11, `md` ×4, `[2rem]` ×3, `[2px]`/`[3px]` ×5, `t-3xl`, `t-2xl`. That is **7+ radii**.

**Spacing:** Tailwind default 4px scale with no custom rhythm. Page gutters are `px-4 sm:px-6`. Content widths vary per page: `max-w-6xl` (home, leaderboard, news), `5xl` (portal), `3xl` (article), `2xl` (rules, log), `md` (portal login).

**Type sizes:** Tailwind scale plus **44 arbitrary sizes**: `text-[13px]` ×18, `[15px]` ×14, `[11px]` ×11, `[10px]` ×1.

**Motion:** keyframes `shimmer` (2.4s infinite, on the gold wordmark), `float`, `pulse-ring`, `marquee` (40s infinite). There are no `prefers-reduced-motion` rules anywhere.

---

## 2. What already works (keep it)

1. **A real identity, not a template.** Deep green `#0F4C3A` with gold `#C9A24B` on warm ivory, plus the eight-point Islamic star pattern, reads as "Saudi school honours board" straight away. It is the site's strongest asset.
2. **The wordmark.** Reem Kufi "النشاط الثقافي" with the small "1448 هـ" is distinctive, and it looks excellent large (hero, admin login, projector).
3. **Correct RTL craft.** Mirrored arrows, right-anchored sidebar, Hijri dates everywhere, `tabular-nums` on scores, and Arabic copy that sounds native.
4. **Admin sidebar.** The dark patterned panel, gold active rail (`layoutId`), section labels and user card are the most premium surface in the product.
5. **Admin login and the printed ID cards.** Both look finished and on-brand. The card print sheet in particular is great.
6. **Student portal hero.** The group-coloured gradient card, big gold points number and rank tile have the right "proud moment" energy.
7. **Mobile navigation model.** The bottom tab bar with a "المزيد" sheet, safe-area padding and `layoutId` indicator is clean and native-feeling. The Modal becomes a bottom sheet on phones, which is correct.
8. **Restraint in structure.** Cards are mostly flat with a soft shadow. Skeletons, empty states and toasts with undo exist, and the atomic-RPC and realtime model gives the UI honest live data.
9. **Group colour as the data colour.** Bars, dots and avatars inherit group colours, which makes standings instantly readable.

---

## 3. Problems ranked by impact

Legend: **H** hurts trust, readability or function; fix first. **M** visible polish loss. **L** refinement.

### HIGH impact

| # | Page(s) | What's wrong | Fix |
|---|---|---|---|
| H1 | `/display` at 1280×720 | **Layout breaks at a very common projector resolution.** The 4th group row (النقاء) runs under the live ticker and is clipped; ranks 4–6 in the left panel disappear entirely. At 1080p the opposite happens: the lower third of both panels is empty and the podium is small. | Build the display on a fixed 16:9 stage (`aspect-video`, scaled with `min(vw, vh·16/9)` or container units) so every element sizes relative to the stage, not the window. Group rows use `flex-1` with `min-h-0` and clamp font sizes to row height. |
| H2 | `/display` | **Clock collides with the date.** The large "9:52 م" places the Arabic "م" low enough to overlap the Hijri date line beneath it. **The ticker is 13px on a projector**, unreadable from the back of a hall. | Render the time as `9:52` with a separate small "م" (or 24-hour time), `leading-none` plus a gap. Ticker text on the display should be at least 22–24px, with the "مباشر" chip scaled to match. |
| H3 | `/` (live state) | **Home is nearly empty today.** `show_groups` is off in the database, so the page is hero, then a ticker showing the *same single event twice* (the marquee duplicates the row even when it doesn't overflow), then one lonely news card pinned right with a large blank area to its left. First impressions currently read "unfinished". | (a) Animate the marquee **only when content overflows**; otherwise show a static row. (b) Add a designed empty/low-content state: a single featured-news layout when there are fewer than 3 posts instead of a 3-column grid. (c) Consider showing standings by default, or a "season starts" block, when groups are hidden. |
| H4 | Global | **No visible, branded focus state.** There are zero `focus-visible` styles. Keyboard focus falls back to the browser's black ring, which is invisible on the green hero and sidebar and looks crude on ivory. | Add a global `:focus-visible { outline: 2px solid var(--color-gold-400); outline-offset: 2px; }` and a green ring on light surfaces. Remove `outline-none` from `.field` in favour of `:focus-visible`. |
| H5 | Global | **Motion ignores `prefers-reduced-motion`.** The infinite gold shimmer on the wordmark, 40s marquee, bobbing crown, pulsing "live" dots and podium springs all run regardless of the setting. The shimmer and bobbing crown also read as gimmicks, not premium. | Wrap the app in `<MotionConfig reducedMotion="user">` and add a CSS `@media (prefers-reduced-motion: reduce)` block that stops `.gold-text`, `.marquee-track` and pulse animations. Make the gold wordmark **static** (a still gradient, optionally one sheen on page load). |
| H6 | Admin → Members, Logs, Rules, Content, Seasons, Settings | **Icon-only buttons have no accessible name.** The audit counted 97 on Members, 20 on Logs, 17 on Rules and 13 on Content. They have only `title` or nothing, and the public header's login icon is the same. Screen readers announce "button". | Make `Button size="icon"` require an `aria-label` prop (type-level), and use the Arabic label (`تعديل`, `حذف`, `إجراء`). |
| H7 | Admin → Content (mobile) | **Horizontal overflow: the page is 588px wide on a 390px phone**, clipping the header and bottom nav. Cause: the posts list uses `grid gap-3` with no column template, so a grid item's `min-width:auto` lets a long title widen the track. The tab bar also clips its third tab ("الواجهة الرئيسية"). | `grid-cols-1` (or `min-w-0` on each row). For the tabs, use icon-plus-short-labels on mobile or a scrollable segmented control with fade edges. |
| H8 | Public (all visitors) | **Every visitor downloads the entire admin app.** `usePrefetch()` in `App.tsx` idle-loads *all* routes, including admin: `exceljs` 930 KB, Reports/recharts 383 KB, Scanner 373 KB and more, about **2.5 MB of JS** on students' phones over mobile data. That hurts the premium "instant" feel and costs data. | Prefetch only public routes for anonymous visitors; prefetch admin routes after login. Better still, prefetch on link hover or viewport. |
| H9 | Global forms | **Inputs are barely visible.** The field border `#e6dcc6` on white is **1.36:1** (WCAG 1.4.11 needs 3:1 for control boundaries), and the placeholder (`muted/60`) is **2.46:1**. On ivory the phone field and search boxes nearly disappear. | Introduce a `--color-line-strong` (about `#cdbf9f`, around 1.8:1 against the card, plus a 1px inner shadow) for inputs, or a sand fill with a darker border. Raise the placeholder to `muted/80`. |

### MEDIUM impact

| # | Page(s) | What's wrong | Fix |
|---|---|---|---|
| M1 | Global | **Palette discipline slips outside the brand.** Log types use sky/violet/teal/rose/amber/slate tiles; the portal attendance grid is a traffic-light mosaic of green, amber and red boxes; dashboard stat numbers are green, blue, gold and red; the silver medal is `#9aa4b2` with white text (**2.52:1**). The screen ends up looking like a template dashboard rather than a green-and-gold institution. | Define **one** semantic set that harmonises with the brand: positive = `primary-600`, negative = a deep maroon (the العطاء family, about `#9B2242`), caution = `gold-500`, info = `ink/60`. Log-type icons become monochrome `primary-700` on `sand`, with only the delta coloured. Attendance days: filled dot for present, half dot for late, hollow for absent, all in brand tones. |
| M2 | Global typography | **Text is too small for Arabic, and the scale is ad hoc.** Root is 15px on mobile, with 44 arbitrary sizes (11/13/15px). Metadata at 11px `muted/80` (3.57:1) is hard to read, and Arabic's small x-height makes 11–13px feel tiny. Headings rely only on bold Readex; Reem Kufi appears only on the logo. | Set root to 16px everywhere. Define a 6-step type scale as tokens (`--text-caption 13`, `--text-body 16`, `--text-body-lg 18`, `--text-title 22`, `--text-headline 28`, `--text-display clamp(36–68)`). Give Arabic body `leading-[1.75]`. Use **Reem Kufi for page H1s and section display titles** (not body), which brings the identity into every page. Drop Readex 300 from the font request. |
| M3 | Global layout | **Page widths and left edges don't line up.** Home is `6xl`, portal `5xl`, article `3xl`, rules and log `2xl`, so content jumps between pages while the header stays `6xl`. The narrow rules and log pages float in a wide empty canvas on desktop. | Two containers only: `--container-wide 72rem` (listings, dashboards) and `--container-read 44rem` (article, rules, log). On desktop, give the narrow pages a right-aligned H1 at the wide container's edge, or a two-column layout (e.g. rules plus a sticky summary). |
| M4 | Global | **Too many radii and ad-hoc shadows** (7+ radii; `shadow`, `shadow-md`, `-lg`, `-2xl` mixed with tokens). Surfaces feel slightly inconsistent. | Tokens: `--radius-sm 8px` (chips, small), `--radius-md 12px` (buttons, inputs), `--radius-lg 20px` (cards), `--radius-xl 28px` (hero, sheets). Two shadows only: `soft` for resting, `lift` for hover and overlay. |
| M5 | Buttons | **Buttons are hand-rolled outside `Button`** in the hero, header CTA, 404, error boundary and leaderboard "وضع العرض". Heights vary (h-8/9/10/11/12) and so do radii. The primary CTA has no hover state in the hero, and gold appears both as a fill and as text. | Route everything through `<Button asChild>`-style polymorphism (or a `ButtonLink`). Fix three heights (36/44/52). Rule: gold fill = the *one* hero CTA per screen; primary green = standard actions; outline = secondary. |
| M6 | `/leaderboard` podium | The rank badge overlaps the avatar initial (the "ع" is half covered). 2nd and 3rd pillars are both flat brand green, so the silver/bronze distinction is lost. The group label sits after a variable `min-h-[2.5em]` gap, so heights look uneven. The podium card crops the pillars at its bottom edge. | Move the rank numeral to the pillar top (large, engraved style) and keep the avatar clean. Tint pillars: 1st gold, 2nd `primary-700`, 3rd `primary-800` with a thin gold rim, all with the same top highlight. Make name and group a fixed two-line block. Give the pillars a baseline "floor" line. |
| M7 | `/leaderboard` ranking list | Rows have a lot of empty middle space; group appears as a tiny grey word; rank numbers 4–23 are muted and small. | Tighten to a real table rhythm: rank (tabular, fixed width), name and group chip together on the right, points on the left with a thin proportional bar. Add sticky section headers ("المراكز 4–10") on long lists. |
| M8 | `/` home (demo) | With 4 posts, the 3-column grid leaves an **orphan card**. On mobile the same full-bleed `FeaturePostCard`s are about 380px tall each, whereas `/news` uses a compact list. The two pages disagree. | Home: 1 large feature and 2 compact cards (editorial layout); cap at 3. Mobile home: one feature card, then the compact `PostCard` list. |
| M9 | `/news/:id` | The article card is fine but generic: a title in Readex bold with `gold-divider` and body `text-lg leading-loose`. There's no author, no back-to-top, and images have no `width`/`height` or `srcset`. | Editorial treatment: category and date above a Reem Kufi or Readex-600 title; image with caption radius; body at `--text-body-lg` / 1.85 capped at about 65ch. Pass intrinsic image size and use Supabase image transforms for `srcset`. |
| M10 | `/log`, `/admin/logs` | The group filter is a **native `<select>`** (not the styled `Select`), showing the OS arrow. Filter chips are 32px tall (below 44px touch). Rows repeat the admin name on every entry. | Use the styled `Select`, or group chips with colour dots. Make chips 40px on touch. Show the admin name only on hover or expand, or in the day header. |
| M11 | `/admin` dashboard | Four stat cards use four different accent colours; action tiles and stat tiles have different paddings; the "0 حضور اليوم" state looks like an error in blue. | One stat style: label in `muted`, value in `ink`, a small brand-coloured delta or sub-line. Put the hero action (بدء التحضير) at a larger size and demote the others to a quiet grid. |
| M12 | `/admin/members` | "نشط" chip on **every** row (noise); 3 action icons per row with a red trash icon always visible; phone column shows "—" for everyone. | Show status only when not active (مقصى). Collapse row actions into a `⋯` menu, or reveal on hover or row-select. Hide empty columns. |
| M13 | Toggles, tabs, modal | `Toggle` is a `<button>` without `role="switch"`/`aria-checked`. Segmented tabs lack `role="tablist"`/`tab`/`aria-selected`. The modal has no focus trap, initial focus or focus return, and no `aria-labelledby`. Toasts are not in an `aria-live` region. | Add the roles and states; trap and restore focus in `Modal`; put `role="status" aria-live="polite"` on the toast stack. |
| M14 | Contrast of small gold text | `gold-500 #b08637` on ivory is **3.11:1** (used for "1448 هـ" at 10px, top-3 rank numbers, badge points); `emerald-600` "+10" is **3.77:1** at 13–15px. | Use `gold-600 #8e6a2b` (4.95:1) for text, keeping gold-400/500 for fills and ornaments only. Positive deltas use `primary-600`. |
| M15 | `/admin/reports` | Native date inputs render **Gregorian mm/dd/yyyy LTR** under Hijri labels, and the page is empty until you press the button. | Default-run the report for the active season on load. Show Hijri dates in the input face (custom date display with a native picker behind it), or at least `dir="ltr"` alignment plus a Hijri echo that's styled as the primary value. |

### LOW impact

| # | Page(s) | What's wrong | Fix |
|---|---|---|---|
| L1 | Global "AI template" tells | Icon-in-rounded-square before every page title and empty state; gradient top bar on every modal; `group-hover:scale-105` on images; emoji in the display ("✨ سيُكشف عن الأبطال قريباً ✨"); pulsing red "مباشر" dot in several places. | Keep the icon square only in the admin `PageHeader` (it works there); remove it on public pages. Use a single thin gold rule instead of the gradient bar. Replace emoji with an ornamental divider built from the star motif. One live dot, and no pulse when reduced motion is on. |
| L2 | Header / footer | The desktop footer is just "النشاط الثقافي … 1448 هـ". The login entry is an unlabeled icon. The mobile header has no page context. | A richer, quiet footer: wordmark, school name (from `home.subtitle`), quick links, "لوحة التحكم" link, and the pattern as a thin band. Label the login icon (tooltip plus `aria-label`). |
| L3 | Hero | The date line at `white/55` is small; the subtitle uses `tracking-[0.3em]` (letter-spacing breaks Arabic joining visually); both CTAs are equal width, so there's no hierarchy. | Remove tracking on Arabic text (keep it for Latin digits only). Make the primary CTA gold and wider, and the secondary a text or ghost link. |
| L4 | `/rules` | Nicely simple, but the "كسب النقاط" list mixes attendance and rules with no grouping, even though `category` exists in the data. | Group by `category` with small section captions; show point values in a consistent right column. |
| L5 | `/me` login | Disabled "دخول" is a washed-out green that reads as broken. | Keep the disabled state neutral (`sand` fill, `muted` text), or enable it and validate on submit. |
| L6 | 404 / error boundary | Generic compass icon; the error boundary is unstyled compared to the rest. | Reuse the star motif and the hero typography; the error boundary uses `Button`. |
| L7 | `index.html` | No Open Graph or Twitter tags, no `apple-touch-icon` or manifest. Shared links on WhatsApp show nothing branded. | Add OG image (the wordmark on the dark pattern), `apple-touch-icon`, `manifest.webmanifest` with theme `#0F4C3A`. |
| L8 | Fonts | 8 font weights requested; weight 300 unused; Reem Kufi 500/600 unused. | Request Readex 400/500/600/700 and Reem Kufi 700 only (or self-host subsets). |
| L9 | Cards page | The on-screen preview area is a large white card with one sentence in it. | Show the first page's cards scaled inside that panel, or remove the panel and let the sheets be the preview. |
| L10 | Tablet (834px) | Uses the phone bottom nav with a desktop 3-column news grid; cards get narrow with 3-line titles. | Use 2 columns between `md` and `lg`, or bring the top nav in from `md`. |

---

## 4. Proposed direction: "Quiet Honours"

Keep everything that carries the identity; take away the noise around it.

**Keep, unchanged:** the wordmark and its two-line lockup; `primary-700 #0F4C3A`, `gold-400 #C9A24B`, `ivory #FAF7F0`; Readex Pro and Reem Kufi; the eight-point star pattern; Hijri dates; group colours as data colours; the dark sidebar and portal hero.

**Change:**
1. **Gold becomes an accent, not a colour field.** Roughly 70% ivory/white, 22% green, at most 8% gold. Gold is reserved for 1st place, the single primary CTA, the active-nav rail and hairline ornaments. No shimmer; a static metallic gradient on the wordmark only.
2. **One semantic palette tuned to the brand** (green positive, maroon negative, gold caution, ink info). All raw Tailwind hues are removed.
3. **Reem Kufi as the display voice on every page** (H1s, section display titles, big numerals on the display page). Readex carries everything else at 16px or larger with generous Arabic leading.
4. **Fewer boxes.** Replace some card-in-card stacks with hairline dividers and whitespace; use the star pattern as a *band* or *frame* (section dividers, footer, empty states) instead of a full-page wallpaper under everything.
5. **Editorial layouts** for the home, news and article pages (feature and compact rhythm) and a proper **16:9 stage** for the projector.
6. **Considered motion:** one entrance per view, `layoutId` indicators, number tick-ups on score change; everything respects reduced motion.

### Optional style skills from the design-skills set (pick 1–2)
The set wasn't installed here, so check the exact names when you install it. These are the directions that suit this brand:
- **`minimalist-ui` (or the set's minimalist/editorial skill):** its hierarchy-through-whitespace, restrained accents and fewer-containers rules map directly onto M1–M4 and L1 without touching identity. **Recommended.**
- **`high-end-visual-design`** (already your quality bar) applied specifically to the **projector display and portal hero**, the two "ceremony" surfaces, where a richer, luxury treatment is appropriate: engraved-looking numerals, metallic hairlines, deep layered greens.

Avoid brutalist, neon/glass or playful/cartoon style skills; they'd fight the scholarly, formal personality.

---

## 5. Phased plan (approve each phase separately)

Each phase is a separate commit/PR, screenshot-diffed with the same harness (desktop, tablet, mobile, and projector at 720p/1080p) before and after.

### Phase 1: Tokens and typography (foundation; low risk, biggest consistency win)
1. Add tokens in `@theme`: type scale (6 steps), radius (sm/md/lg/xl), `line-strong`, semantic `positive`/`negative`/`caution`/`info`, containers (`wide`/`read`), focus ring.
2. Root font 16px on all breakpoints; Arabic body leading about 1.75; remove letter-spacing on Arabic.
3. Reem Kufi for page H1s via `PageHeader` and section titles; trim font weights in `index.html`.
4. Global `:focus-visible` ring (H4); reduced-motion CSS and `MotionConfig` (H5); static gold wordmark.
5. Fix contrast pairs (H9, M14): input borders, placeholders, small gold text, the silver medal.

### Phase 2: Components
1. `Button`: three sizes, polymorphic link variant, required `aria-label` on icon size; replace every hand-rolled CTA (M5, H6).
2. `Field`/`Select`: stronger border, 44px height; replace the native select on `/log` (M10).
3. `Toggle` (`role="switch"`), segmented tabs (`tablist`), `Modal` focus management, toasts `aria-live` (M13).
4. Unify `StatCard`, `EmptyState`, `Chip`, `LOG_TYPES` to the semantic palette (M1, M11); remove icon squares on public pages and the modal gradient bar (L1).
5. Radius and shadow sweep to tokens (M4).

### Phase 3: Page layouts
1. **Display:** 16:9 stage, clock fix, projector-size ticker, fill the empty space (H1, H2). *Test on the real projector.*
2. **Home:** marquee only when overflowing, low-content states, editorial news block, mobile compact list (H3, M8).
3. **Leaderboard:** podium rebuild and ranking table rhythm (M6, M7).
4. **Containers:** wide/read widths everywhere; rules grouped by category (M3, L4).
5. **Article** editorial typography and image `srcset` (M9).
6. **Admin:** Content overflow fix (H7); members row actions and status noise (M12); dashboard hierarchy (M11); reports default-run and Hijri dates (M15); cards preview (L9).
7. **Footer and header** refinements (L2, L3); tablet breakpoint (L10).

### Phase 4: Motion, performance and polish
1. Prefetch only public routes for visitors; admin after login (H8).
2. Score tick-up and rank-change animations on the display and leaderboard (spring, respects reduced motion).
3. OG and manifest meta (L7), 404/error-boundary styling (L6), disabled states (L5).
4. Final a11y pass (keyboard-only walk-through, VoiceOver Arabic spot check) and the screenshot regression set.

**Suggested order if you want the quickest visible win:** Phase 1, then the Phase 3 display and home fixes (H1–H3), then the rest.

---

*Screenshots (72), the capture script and the fixtures are in the session scratchpad, not committed to the repo. I can add a curated before/after set to the repo when implementation starts.*
