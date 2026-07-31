# Dashboard Widgets Design System

This document outlines the standard UI implementation for all dashboard widget components.

## Core Container
All charts and cards inside the dashboard grid should use the following wrapper format:
```tsx
<div className="w-full border border-stone-alt bg-white rounded-xl overflow-hidden flex flex-col h-full">
```
- `border border-stone-alt` for premium defined edges without drop shadows.
- `bg-white` (or `bg-ivory` if mapped) to maintain high contrast with the dashboard's `stone` app shell background.
- `rounded-xl` for the outer geometry.

## Widget Headers
Headers should always have an explicit internal bottom border separating the text from the visual content:
```tsx
<div className="p-5 sm:p-6 border-b border-stone-alt flex items-center justify-between gap-4">
  <div>
    <h3 className="text-lg font-bold text-ink tracking-tight leading-none mb-1.5">
      Widget Title
    </h3>
    <p className="text-[12px] font-medium text-zinc-400 leading-none">
      Widget subtitle
    </p>
  </div>
  {/* Optional Right-aligned action or count */}
</div>
```

## Recharts Integrations
- **Bar Charts (e.g. Top Cities):** Use custom `<defs>` with SVG `<linearGradient>` to apply vertical gradients to the bars. Wait for the explicit layout height like `h-[320px]` to ensure `ResponsiveContainer` does not get squashed by grid flex rules.
- **Pie Charts (e.g. Lead Sources):** Use SVG gradients within the pie slices. Central counts should use Recharts' `<Label position="center">` to ensure perfect bounding alignment.
- **Tooltips:** Should use dark mode popovers (`bg-[#1A1A1A]` and white text) with a flat design (`border: none`, `borderRadius: 0px`).

## Empty States & Loading
- **Empty Data (`stats.length === 0`):** Do NOT return `null` if it will break the CSS grid flow. Instead, return the core container and header, and insert an empty placeholder:
  ```tsx
  <div className="p-5 sm:p-6 w-full h-[320px] flex items-center justify-center">
    <p className="text-sm text-zinc-500 font-medium">Waiting for AI...</p>
  </div>
  ```
- **Loading State:** Match the identical outer card UI, but insert `<Skeleton>` primitives for the text headers and the chart body to avoid layout shift.

## Buttons
- Per the updated guidelines, all general action buttons should use `rounded-md`.
- Ensure standard dashboard geometry uses `rounded-xl` for cards, `rounded-lg` for nested surfaces, and `rounded-md` for inputs/buttons.
