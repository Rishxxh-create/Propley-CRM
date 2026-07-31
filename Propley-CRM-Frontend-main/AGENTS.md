# Propley Sales Engine — Agent Documentation

Essential context for maintaining the **Propley Sales Portal**. Preserve the premium “Sera” architectural identity. **Source of truth for tokens:** `src/app/globals.css`. `STYLE_GUIDE.md` is legacy (Space Grotesk) — do not follow it for new work.

---

## 1. Design System: Sera Edition

Minimalist, high-contrast, sharp geometry — inspired by architectural journals.

### Color tokens (`globals.css` `@theme`)

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `ivory` | `#FFFFFF` | Primary surfaces, cards, form drawers |
| `stone` | `#FBFBFA` | App shell background (`body`, dashboard) |
| `stone-alt` | `#F2F2F0` | Borders, dividers, input underlines |
| `ink` | `#1A1A1A` | Primary text, ink CTAs |
| `gold` | `#8B6B3F` | Accents, focus borders, active nav |
| `gold-hover` | `#A0835D` | Hover on gold text/links |
| `gold-muted` | `#D4C3A9` | Text selection highlight |
| `gold-light` | `#FFC977` | **Cinematic session only** — live badges, active controls on dark UI |
| `gold-light-hover` | `#FFD383` | Cinematic hover |
| `gold-light-muted` | `#E5D5B9` | Cinematic muted accents |
| `obsidian` | `#0A0A0A` | Moderator sidebar/footer dark surfaces (`bg-obsidian`) |

**Cinematic stage:** Sessions use `bg-[#0A0A0A]` / `bg-black/20` with blurred property imagery — not the ivory/stone dashboard palette.

**External brand color:** WhatsApp actions use `#075E54` (meetings share, `WhatsAppShareModal`, actions menu) — intentional exception.

### Typography

- **Font:** **DM Sans** only (`next/font/google` in `layout.tsx`, weights 400 / 500 / 600).
- **Dashboard headings:** `text-4xl` or `text-5xl`, `font-semibold`, `tracking-tight`, sentence case (e.g. “Executive Overview”, “Meetings.”).
- **Dashboard labels:** `text-xs`, `font-medium`, zinc muted — use `.label-premium` utility when appropriate.
- **Menu section labels** (dropdown headers): `text-[10px] font-semibold normal-case tracking-[0.12em] text-zinc-400` — not uppercase.
- **Cinematic labels:** `text-[9px]`–`text-[10px]`, often `uppercase` + `tracking-widest` / `tracking-[0.15em]` on dark UI.
- **Weights:** Prefer `font-normal`, `font-medium`, `font-semibold`. **`font-bold` exists** on analytics, moderator chrome, and some shadcn primitives (`label.tsx`) — avoid adding new bold usage on dashboard ivory surfaces; cinematic dark UI may use bold for micro-labels.
- **Do not** introduce `font-bold` on new dashboard marketing copy; match nearby components.

### Geometry & radius

- Global `--radius: 8px` — **always use proportional rounded classes** (`rounded-xl` for outer cards, `rounded-lg` for inner surfaces, `rounded-md` for buttons/inputs).
- **IMPORTANT RULE**: DO NOT USE SHADOWS. Maintain a flat, minimalist aesthetic relying entirely on borders and colors rather than elevation (`shadow-sm`, `shadow-md`, etc. are strictly forbidden).
- Exception: small status dots in cinematic UI may use `rounded-full` for live indicators only.

### Inputs (`src/components/ui/input.tsx`)

- Bottom border only: `border-b border-stone-alt`, transparent background, `h-12`.
- Placeholders: `placeholder:text-zinc-400 placeholder:font-normal` (never all-caps).
- Focus: `focus-visible:border-gold`, no ring (Sera override).
- Pair with `@/components/ui/label` and Remix icons positioned `absolute right-0` on auth-style fields.

### Scrollbars

- Default: thin zinc thumb; hover → `gold` (`globals.css`).
- Cinematic lists: `custom-scrollbar` (gold thumb).

### Signature accents

- **Gold top bar:** `h-[6px] bg-gold` on auth (`AuthOverlay`) and participant entry (`EntryScreen`).
- **Nav active state:** `border-l-2 border-gold` + `bg-stone/50` in `Sidebar`.
- **Page title flourish:** `w-16 h-[2px] bg-gold` under meetings/admin headings.

---

## 2. Persona & Terminology

Built for a **premium real estate sales team** showcasing **developments**, **estates**, and **cinematic projects** — not generic “houses.”

| Avoid | Prefer (in UI copy) |
| :--- | :--- |
| Agent, Broker, User | **Advisor**, **Consultant**, **Sales Member** |
| Start Meeting (marketing CTAs) | **Initialize Engine**, **Enter Sales Portal** |
| House / Home (product) | **Project**, **Development**, **Presentation** |

**In code:** Route folders use `moderator` and `participant` — keep those path names; user-facing strings use Advisor/Consultant.

**Auth copy:** “Sales Console”, “Consultant Onboarding”, “Become a Consultant” (`AuthOverlay`).

**Nav labels:** Sidebar shows “Presentations” → `/meetings`; quick action “Schedule Presentation” → `/meetings/new`.

### CMS access roles (`src/lib/roles.ts`)

| Role | Purpose |
| :--- | :--- |
| `super_admin` | Full platform + team provisioning |
| `admin` | Operations — manage consultants/advisors |
| `advisor` | Host presentations, own portfolio |
| `consultant` | Read-focused, co-host support |

Assign roles via **`TeamMemberDrawer`** on `/admin/team`. Role definitions and **`PLATFORM_PERMISSIONS`** (sorted union used by roles editor + permission matrix) live in `roles.ts`. Team seed data: **`TEAM_MEMBERS`** in `mock-data.ts`.

---

## 3. Data layer

### Mock seed (`src/lib/mock-data.ts`)

| Export | Type | Purpose |
| :--- | :--- | :--- |
| `TEAM_MEMBERS` | `TeamMember[]` | Advisors/consultants for team admin + assignment |
| `CUSTOMERS` | `Customer[]` | CRM table + `CustomerSelect` |
| `DEVELOPMENTS` | `Development[]` | Canonical project catalog (names align with meeting `property` fields) |
| `MEETINGS` | `Meeting[]` | Default presentations registry when localStorage is empty |
| `StoredMeeting` | type | Presentation row shape (+ optional `id`, `salesMemberId`, `clientId`) |

**Lookups:** `getTeamMemberById`, `getCustomerById`, `getDevelopmentById`, `getDevelopmentByName`, `getAdvisorName`.

**Meeting times** in seed data use 12-hour strings (e.g. `2:30 PM`). The schedule wizard stores 24h `HH:mm` via `TimeSelect`; `presentation-templates.ts` formats for display.

### Client persistence (localStorage)

| Key | Module | Event |
| :--- | :--- | :--- |
| `propley_meetings` | meetings CMS, wizard, modal | `propley_meetings_updated` |
| `propley_roles` | `/admin/roles` role editor | — |
| `propley_post_meeting_notes` | `post-meeting-notes.ts`, post-analysis | `propley_post_meeting_notes_updated` |
| `propley_customers` | `customers-store.ts`, CRM, profile | `propley_customers_updated` |
| `propley_client_notes` | `client-notes.ts`, client profile | `propley_client_notes_updated` |
| `propley_current_advisor` | `current-advisor.ts`, dashboard | `propley_current_advisor_updated` |
| `propley_invite_templates` | `invite-templates-store.ts`, `/settings/templates` | `propley_invite_templates_updated` |

### User-facing copy (`src/lib/copy.ts`)

Centralized labels for nav, pages, actions, admin, and session UI. Import `PAGE`, `NAV`, `ACTIONS`, `ADMIN_COPY`, `SESSION`, `getPageTitle` — do not hardcode marketing strings in components when a key exists here.

### Supporting lib modules

| Module | Purpose |
| :--- | :--- |
| `copy.ts` | Sales-team copy — nav, page titles, CTAs, session strings |
| `roles.ts` | `AccessRole`, `ACCESS_ROLES`, `PLATFORM_PERMISSIONS`, `getRoleDefinition` |
| `navigation.ts` | `CRM_NAV`, `ADMIN_ROUTE_META` (labels from `copy.ts`) |
| `presentation-templates.ts` | Merge tags, email/WhatsApp defaults, `resolvePresentationContext`, time parsing |
| `calendar.ts` | `buildGoogleCalendarUrl`, `downloadIcsFile`, `meetingCalendarFromSchedule` |
| `post-meeting-analysis.ts` | Mock transcript, AI notes, slide heatmaps, Clarity URL |
| `post-meeting-notes.ts` | Advisor notes CRUD per meeting id |
| `presentations-store.ts` | Read/write/filter/bulk `propley_meetings` |
| `customers-store.ts` | Read/write CRM clients + `dealStage` |
| `client-notes.ts` | Profile notes per client id |
| `client-timeline.ts` | Timeline events for client profile |
| `current-advisor.ts` | Mock “logged in” advisor for dashboard |
| `invite-templates-store.ts` | Per-project email/WhatsApp templates |
| `presentation-status.ts` | Shared status badge classes |
| `export-presentation-pdf.ts` | Print/PDF export helpers |
| `toast.ts` | Sonner wrappers (`TOAST` copy) |
| `lead-source-options.ts` | `LEAD_SOURCE_OPTIONS` for schedule wizard |
| `brand-logos.ts` | `BRAND_LOGO_PATHS`, lead-source logo mapping (`public/company/`) |
| `utils.ts` | `cn()` (`clsx` + `tailwind-merge`) |

### Path aliases

- `@/components`, `@/components/ui`, `@/lib/*`

### API fetch optimization (browser)

Shared reads use **Axios** via BFF (`src/lib/api/*`). Prevent duplicate calls:

| Rule | Implementation |
| :--- | :--- |
| Single loader | `useLoadEventStats()` in `DashboardLayout` only |
| Read in UI | `useEventStats()` in `AdvisorOverview` — no `dispatch` |
| Thunk guard | `fetchEventStatsThunk` `condition`: `idle` \| `error` only |
| Axios dedupe | `fetchEventStats()` shared in-flight promise in `events.ts` |
| Cancel | Thunk `signal` → `eventsClient.get(..., { signal })` |
| Reset | `clearEventStats()` on sign-out |

**Docs:** `docs/api-strategy.md`, `docs/axios-api-optimization.md`, `docs/api.md`, `docs/adding-api-endpoint.md` (registry — one entry per GET, no per-path BFF file). **Do not** dispatch the same GET thunk from `Sidebar` and a page component.

---

## 4. Application architecture

### Routes (`src/app`)

| Route | Role |
| :--- | :--- |
| `/` | **Advisor dashboard** — role-scoped stats, today’s presentations, my clients |
| `/meetings` | **Presentations registry** — filters, bulk actions, table/cards, share, reschedule |
| `/meetings/calendar` | Month calendar of presentations |
| `/meetings/new` | **Schedule Presentation** — wizard: schedule → email → WhatsApp (`?client=` prefill) |
| `/customers/[id]` | Client profile — advisor, pipeline, timeline, notes, history |
| `/settings/templates` | Per-project invite templates (email + WhatsApp) |
| `/meetings/[id]/analytics` | Session analytics (mock metrics) |
| `/meetings/[id]/post-analysis` | Post-meeting intelligence — transcript, AI notes, recordings, Clarity heatmaps, advisor notes |
| `/meetings/[id]/resend` | Resend email / WhatsApp invitation for a stored meeting |
| `/customers` | Customer CRM table + `AddCustomerModal` |
| `/admin` | Redirects to `/admin/team` |
| `/admin/team` | Team members + role assignment (`TeamMemberDrawer`) |
| `/admin/roles` | Role policy cards + editable permissions (`propley_roles`) |
| `/admin/permissions` | Read-only permission matrix across roles |
| `/auth` | Login / register (`AuthOverlay`) |
| `/moderator/[roomId]` | **Sales session host** — theater, observer sidebar, drawers |
| `/participant/[roomId]` | **Client session** — entry gate → theater + command bar |

**Removed admin routes** (do not reintroduce without product ask): `/admin/registry`, `/admin/developments`, `/admin/audit`.

### Layout patterns

- **Dashboard shell:** `DashboardLayout` = `Sidebar` (272px) + `TopBar` + scrollable `main` (`p-6 md:p-10`, `max-w-6xl`).
- **Admin shell:** `src/app/admin/layout.tsx` wraps pages in `AdminProvider`.
- **Session shell:** Full viewport `h-[100dvh]`, dark cinematic chrome, no dashboard sidebar.

### Sidebar navigation (`CRM_NAV`)

| Section | Items |
| :--- | :--- |
| Sales Hub | Executive Overview `/`, Presentations `/meetings` |
| Portfolio | Customers `/customers` |
| Administration | Access Control → Team Members, Role Policies, Permission Matrix |
| Quick Actions | Schedule Presentation (`action: 'new-meeting'` → `/meetings/new`) |

### Component folders (`src/components/`)

| Folder | Contents |
| :--- | :--- |
| `layout/` | `DashboardLayout`, `Sidebar`, `TopBar`, `PageHeader` |
| `presentations/` | Meetings CMS UI — actions menu, modals, date/time, customer select |
| `presentations/wizard/` | Schedule flow editors (shared by `/meetings/new` and `/meetings/[id]/resend`) |
| `customers/` | Profile cards, `AddCustomerModal`, pipeline, timeline |
| `dashboard/` | `AdvisorOverview` |
| `admin/` | `TeamMemberDrawer` |
| `auth/` | `AuthOverlay` |
| `ui/` | shadcn primitives |
| *(root)* | `UniversalSelect`, `BrandLogo`, `MicrosoftClarity` |

### Key components

| Component | Location | Notes |
| :--- | :--- | :--- |
| `Sidebar`, `TopBar` | `layout/` | CRM nav from `navigation.ts`; titles from `getPageTitle()` |
| `PageHeader` | `layout/` | Breadcrumbs + animated title for admin / wizard pages |
| `MeetingActionsMenu`, `MeetingMobileCard` | `presentations/` | Row actions + mobile card on `/meetings` |
| `DatePicker`, `TimeSelect` | `presentations/` | Sera bottom-border styling; `modal={false}` in drawers |
| `UniversalSelect`, `CustomerSelect` | `presentations/` + root | Inline comboboxes (no portaled cmdk inside vaul drawers) |
| `BrandLogo` | root | Lead-source / calendar brand marks via `brand-logos.ts` |
| `AddToCalendarActions` | `presentations/` | Google Calendar + `.ics` (`calendar.ts`) |
| `NewMeetingModal` | `presentations/` | Compact drawer wizard; optional entry from `DashboardLayout` |
| `ResendEmailDialog` | `presentations/` | Email preview + resend confirmation |
| `AddCustomerModal` | `customers/` | Right `Drawer` (vaul), 500px desktop |
| `TeamMemberDrawer` | `admin/` | Role assignment drawer |
| `WhatsAppShareModal` | `presentations/` | `mode`: `'share'` \| `'resend'` |
| `MicrosoftClarity` | root | Site-wide Clarity (`wsfm0rhyky`) in root `layout.tsx` |
| `AuthOverlay` | `auth/` | Split hero + form |
| `AdminProvider`, `TeamAccessTable` | `admin/_components/` | Admin context + team table |
| `AdvisorNotesCard` | `meetings/.../post-analysis/_components/` | Persisted notes via `post-meeting-notes.ts` |
| `ObserverSidebar` | `moderator/.../` | 360px desktop; advisor + client feeds |
| `TheaterView` / `ParticipantTheater` | session `_components/` | Shared presentation surface |
| `FooterControls` / `CommandBar` | session `_components/` | Mic/cam/slide/end controls |
| `Drawers` | `moderator/.../` | Custom motion drawer (analytics 800px, visitors 450px) — not vaul |
| `GuideOverlay` | `moderator/.../` | Sales narrative overlay when script drawer active |

---

## 5. Component standards (shadcn + Sera)

Stack: **shadcn v4** (`style: base-sera` in `components.json`), **@base-ui/react** primitives, **vaul** for `Drawer`, **cmdk** for command palette (avoid inside drawers), **date-fns** + `Calendar`.

### Buttons

- Primary CTA: `variant="propley"` → `bg-ink`, `hover:bg-gold`, `py-6`, `text-xs font-semibold`, `rounded-none`.
- Secondary: `outline`, `ghost`, or `bg-stone` per context.
- Cinematic toggles: glass nodes `bg-white/5 border-white/10`; active → `gold-light` + black text.
- **Base UI `render` prop:** Our `Button` wrapper does **not** forward refs. For `Menu.Trigger`, `Dialog.Close`, etc., style the primitive directly with `buttonVariants({...})` or a native `<button>` — do not use `render={<Button />}`.

### Modals & drawers

| Pattern | When |
| :--- | :--- |
| `Dialog` | Confirmations, WhatsApp share, resend email, `EndSessionModal` |
| `Drawer` (`direction="right"`) | New meeting modal, add customer, team member, **reschedule on `/meetings`** — `sm:w-[500px]`, `border-s`, `bg-white` |
| Custom `motion.aside` | Moderator analytics/visitors (`Drawers.tsx`) — overlay `bg-black/60 backdrop-blur-md` |

Default vaul overlay is light (`bg-black/20`); **override** to `bg-ink/60 backdrop-blur-md` when matching cinematic spec.

**Inside vaul drawers:** Use `modal={false}` on `Popover`/`DatePicker`; prefer `CustomerSelect` / `UniversalSelect` (inline lists) over portaled `Command` comboboxes.

### shadcn UI inventory (`src/components/ui/`)

`button`, `input`, `textarea`, `label`, `checkbox`, `card`, `table`, `dialog`, `drawer`, `sheet`, `popover`, `select`, `command`, `calendar`, `tooltip`, `input-group`, **`dropdown-menu`** (Base UI `Menu`).

### Dropdown menus (Base UI `Menu`) — critical

`DropdownMenuLabel` maps to `Menu.GroupLabel` and **requires** a parent `Menu.Group` context. In practice:

- **Preferred for Sera section headers:** plain `<motion.div role="presentation">` with menu label classes inside `DropdownMenuContent` (see `MeetingActionsMenu.tsx`).
- If using `DropdownMenuLabel`, wrap label + items in `<DropdownMenuGroup>`.
- **Trigger:** Use `DropdownMenuTrigger` as a native `<button>` with `buttonVariants()` — not `render={<Button />}`.
- **Item copy:** Override shadcn defaults with `normal-case tracking-normal` on menu items; icons `react-icons/ri` at 15px, gold accent.
- **Portal z-index:** Content uses `z-[1100]` when overlapping table cards.

### Icons

- **App features:** `react-icons/ri` (Remix Icon).
- **shadcn primitives:** `@remixicon/react` (e.g. dialog close, select chevrons).
- **CDN fallback:** `remixicon.css` linked in `layout.tsx` — prefer React icon imports in new code.

### Motion (`framer-motion`)

- **Dashboard pages:** `initial={{ opacity: 0, y: 10 }}`, ~0.4s easeOut; lists stagger `0.1s`.
- **Drawers (custom):** slide from `x: 100%`, duration `0.5`, ease `[0.16, 1, 0.3, 1]`.
- **Entry / auth:** slide up `y: 20`, longer ease `[0.23, 1, 0.32, 1]`.
- **Utility:** `.animation-slide-up` in `globals.css` for observer client list.

### Cinematic drawers & sidebars

| Surface | Width | Background |
| :--- | :--- | :--- |
| Form drawers (vaul) | 500px (`sm:w-[500px]`) | `bg-white` / ivory |
| Observer sidebar | 360px (`md:w-[360px]`) | `bg-obsidian`, `border-white/10` |
| Analytics drawer | 800px | `bg-ivory` |
| Visitors drawer | 450px | `bg-ivory` |

---

## 6. Presentations CMS (`/meetings`)

### Data & persistence

- Initial load: `localStorage.getItem('propley_meetings')` or fallback `MEETINGS` from `mock-data.ts`.
- Saves: `localStorage.setItem('propley_meetings', JSON.stringify(...))`.
- Cross-page refresh: dispatch/listen `propley_meetings_updated` (wizard, modal).

### Layout

- **Desktop:** `Card` + shadcn `Table` (`min-w-[1100px]`), registry count bar, `overflow-hidden` on card (menu portals outside).
- **Mobile:** Stacked cards via `MeetingMobileCard` with motion stagger; same actions via `MeetingActionsMenu`.

### Status badges

| Status | Classes |
| :--- | :--- |
| `Live` | `bg-gold/10 text-gold border-gold/30` |
| `Scheduled` | `bg-stone text-zinc-500 border-stone-alt` |
| `Completed` | `bg-stone text-zinc-600 border-stone-alt` |
| `Canceled` | `bg-red-50 text-red-600 border-red-100`; locks portal + mutes row |

### Access & share column (inline)

- **Sales Portal** → `/moderator/[uuid]` (disabled when canceled).
- **Copy** participant link (`/participant/[uuid]`) via tooltip `CopyButton`.
- **Share Invite** → `WhatsAppShareModal` (`mode="share"`).

### `MeetingActionsMenu` (⋮)

Grouped sections: **Session actions** · **Notifications** · **Intelligence** · manage (reschedule / cancel).

| Action | Behavior |
| :--- | :--- |
| Enter sales portal | `router.push(/moderator/[uuid])` |
| Copy participant link | Parent `onCopyLink` |
| Share / Resend WhatsApp | `WhatsAppShareModal` |
| Resend email | `ResendEmailDialog` + `PresentationContext` |
| Post-meeting analysis | `/meetings/[id]/post-analysis` |
| Session analytics | `/meetings/[id]/analytics` |
| Reschedule | Opens vaul drawer with `DatePicker` + `TimeSelect` |
| Cancel session | Sets `status: 'Canceled'` in localStorage |

**Primary CTA:** Header “New Meeting” → `/meetings/new`. Sidebar quick action uses the same route.

---

## 7. Schedule Presentation wizard (`/meetings/new`)

Colocated under `src/components/presentations/wizard/` (used by `/meetings/new` and resend):

| File | Role |
| :--- | :--- |
| `PresentationStepper` | Steps: `schedule` → `email` → `whatsapp` |
| `EmailTemplateEditor` / `EmailInvitationPreview` | Merge tags + HTML preview |
| `WhatsAppTemplateEditor` / `WhatsAppChatPreview` | Template + chat mock |
| `ReservationSummary`, `MergeTagBar`, `WizardFooter` | Sidebar summary + navigation |
| `FormFieldLabel` | Shared label + icon pattern |

**Form controls:** `CustomerSelect` (existing), manual fields (new lead), `UniversalSelect` + `LEAD_SOURCE_OPTIONS`, free-text development name, `DatePicker`, `TimeSelect` (stores 24h `HH:mm`).

**On submit:** Prepend `StoredMeeting` to localStorage, fire `propley_meetings_updated`, redirect `/meetings`.

**Templates:** `presentation-templates.ts` — `{client_name}`, `{project_name}`, `{meeting_date}`, `{meeting_time}`, `{meeting_link}`.

**Calendar:** `AddToCalendarActions` in email preview step uses `calendar.ts`.

---

## 8. Post-meeting intelligence

**Route:** `/meetings/[id]/post-analysis`  
**Data:** `getPostMeetingAnalysis(meetingId)` from `post-meeting-analysis.ts` (mock); enriches from `propley_meetings` when available.

Surfaces: transcript status, AI notes, recording assets, per-slide Clarity heatmaps, social profiling toggle, **advisor notes** (`AdvisorNotesCard` + `post-meeting-notes.ts`), link to Clarity dashboard.

**Analytics:** `/meetings/[id]/analytics` — separate session metrics page; both linked from actions menu.

**Resend flow:** `/meetings/[id]/resend` — full-page email/WhatsApp resend using wizard editors.

**Clarity:** `MicrosoftClarity` in root layout; heatmap narrative references Microsoft Clarity — keep project ID `wsfm0rhyky` in sync.

---

## 9. Interaction patterns

### Dashboard

- Mobile: hamburger opens `Sidebar` overlay (`bg-ink/40 backdrop-blur-md`).
- Schedule flows: prefer `/meetings/new`; `NewMeetingModal` still mounted in `DashboardLayout` for optional drawer entry.

### Moderator session

- **Observer sidebar:** Desktop column; mobile **participant strip** (`h-24`, horizontal scroll) when `showObservers` is true.
- **Footer “Team” / visitors control:** Toggles `showObservers`; active state uses `gold-light` on dark footer (`FooterControls`).
- **Header nodes:** Analytics, Script, Visitors — `activeNodeClass` uses `gold-light` glow.
- **Script drawer:** Rendered as `GuideOverlay` inside `TheaterView`, not the sliding `Drawers` panel.

### Participant session

- **Entry gate:** Name + phone on ivory before theater (`EntryScreen`).
- **Presence:** `VideoSurface` + `CommandBar` toggle visibility.
- **Join CTA:** Copy aligned with “Initialize Engine” / enter experience language.

---

## 10. Technical stack

| Layer | Choice |
| :--- | :--- |
| Framework | **Next.js 16** (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | **Tailwind CSS v4** (`@import "tailwindcss"`, `@theme inline` in `globals.css`) |
| UI | shadcn v4 + Base UI + vaul + CVA |
| Motion | framer-motion ^12 |
| Icons | react-icons/ri + @remixicon/react |
| Utilities | `date-fns`, `cmdk`, `class-variance-authority`, `tailwind-merge` |

**Scripts:** `npm run dev` | `build` | `start` | `lint`

---

## 11. Guidelines for AI assistants

1. **Tokens first** — Add colors only in `globals.css` `@theme`; use semantic names (`gold-light` for cinematic, not random hex).
2. **Geometry** — New surfaces: Use `rounded-md` for buttons/inputs, `rounded-xl` for outer dashboard cards, and `rounded-lg` for inner surfaces. Do not use `rounded-none` for buttons. No rounded cards/buttons on cinematic UI.
3. **Two UI modes** — Ivory/stone dashboard vs `#0A0A0A` cinematic; do not mix gold-light accents on white marketing pages unless intentional.
4. **Copy** — Advisor/Consultant/Development language; CTAs “Initialize Engine” / “Enter Sales Portal”.
5. **No placeholder lorem** — Use realistic names, cities, project titles (see `mock-data.ts`).
6. **Images** — Real architectural photography URLs (Unsplash) or project assets; avoid gray boxes in production-facing UI.
7. **Consistency** — Read this file and `globals.css` before edits; ignore outdated `STYLE_GUIDE.md` font/spacing rules.
8. **Scope** — Colocate session-only UI under `src/app/moderator/` or `participant/` `_components/`; shared chrome under `src/components/`.
9. **Dropdown menus** — Never use `DropdownMenuLabel` without `DropdownMenuGroup`; prefer plain div section headers (`MeetingActionsMenu` pattern).
10. **Base UI refs** — Do not pass `render={<Button />}` to primitives that need refs; use `buttonVariants` on native elements.
11. **Meetings data** — Use `StoredMeeting` / `MeetingStatus` types; persist via `propley_meetings` localStorage key.
12. **Developments catalog** — Use `DEVELOPMENTS` / `getDevelopmentByName` for canonical project metadata; scheduling UI currently accepts free-text project names.
13. **Permissions** — Use `PLATFORM_PERMISSIONS` from `roles.ts` for any permission checklist UI.
14. **Commits** — Only when the user explicitly asks.
15. **API reads** — One layout loader + thunk `condition` + domain in-flight dedupe; never duplicate `dispatch(fetch*Thunk())` across sibling components. See §3 API fetch optimization.

---

## 12. Quick reference snippets

```tsx
// Dashboard page wrapper
<DashboardLayout>{children}</DashboardLayout>

// Primary CTA
<Button variant="propley">Initialize Engine</Button>

// Dropdown trigger (safe Base UI pattern)
<DropdownMenuTrigger
  type="button"
  className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
>
  <RiMore2Fill size={18} />
</DropdownMenuTrigger>

// Section header inside dropdown (no GroupLabel)
<div role="presentation" className="px-3 py-2 text-[10px] font-semibold tracking-[0.12em] text-zinc-400">
  Session actions
</div>

// Right form drawer
<Drawer open={isOpen} onOpenChange={onClose} direction="right">
  <DrawerContent className="h-full rounded-none border-s border-stone-alt bg-white sm:w-[500px]">
```

```tsx
// Persist presentation after wizard
const updated = [newMeeting, ...meetingsList];
localStorage.setItem('propley_meetings', JSON.stringify(updated));
window.dispatchEvent(new Event('propley_meetings_updated'));
```

```tsx
// Advisor note
import { addAdvisorNote, POST_MEETING_NOTES_KEY } from '@/lib/post-meeting-notes';
addAdvisorNote(meetingId, body, authorName);
```
