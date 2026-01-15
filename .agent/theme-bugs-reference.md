# Theme Development - Common Bugs & Solutions

## Bug 1: Cassette Dragging Goes Behind Player (Z-Index Issue)

**Problem:** When using CSS grid columns, each column creates a separate stacking context. Z-index only works within the same stacking context, so dragged cassettes appear behind elements in other columns.

**Solution:** Use a "Floating Drag Ghost" pattern:
```tsx
// Track drag state
const [draggingMix, setDraggingMix] = useState<{mix: Mix, index: number} | null>(null);
const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);

// Render a SEPARATE fixed-position element at root level
{draggingMix && dragPosition && (
    <div 
        className="fixed pointer-events-none"
        style={{ left: dragPosition.x - 72, top: dragPosition.y - 48, zIndex: 99999 }}
    >
        {/* Cassette visual */}
    </div>
)}
```

---

## Bug 2: Player Control Buttons Not Working

**Problem:** When player is draggable, drag events interfere with button clicks.

**Solution:** Don't make the player draggable. Use simple `onClick` handlers:
```tsx
<button onClick={() => { playClick(); togglePlay(); }}>
    {isPlaying ? <Pause /> : <Play />}
</button>
```

---

## Bug 3: Laggy Cassette Dragging

**Problem:** Framer Motion's `layoutId` causes expensive layout recalculations.

**Solution:** 
1. Remove `layoutId` from draggable items
2. Add GPU acceleration: `className="transform-gpu will-change-transform"`
3. Use `dragMomentum={false}` and `dragElastic={0.05}`

---

## Bug 4: Scrollbar Visible

**Problem:** Scrollbars showing on cassette list or main container.

**Solution:** Add global CSS to hide scrollbars:
```tsx
<style jsx global>{`
    ::-webkit-scrollbar { display: none; }
    * { -ms-overflow-style: none; scrollbar-width: none; }
`}</style>
```

---

## Bug 5: Cassette List Not Scrolling

**Problem:** Flex container doesn't allow overflow scrolling.

**Solution:** Add `min-h-0` to flex children and `overflow-y-auto`:
```tsx
<div className="col-span-3 flex flex-col min-h-0">
    <div className="flex-1 overflow-y-auto min-h-0">
        {/* Cassettes */}
    </div>
</div>
```

---

## Bug 6: Content Cut Off at Different Zoom Levels

**Problem:** Fixed sizes don't adapt to viewport.

**Solution:** 
1. Use `h-screen` on container
2. Use `flex-1` for main content to fill remaining space
3. Keep elements compact with smaller sizes
4. Use `justify-center` instead of `justify-end` for status panel

---

## Bug 7: Header Buttons Not Visible

**Problem:** Icon color same as background.

**Solution:** Use explicit colors:
```tsx
<button className="bg-white border border-neutral-200">
    <Smartphone size={14} className="text-neutral-600" />
</button>
```

---

## Bug 8: Volume Slider Moves Player

**Problem:** Dragging volume slider triggers player drag.

**Solution:** Don't make player draggable. Volume slider works independently.

---

## Required Buttons (Theme Development Rules)
1. Cinema Mode
2. + Create Mix
3. Switch to iPod (Smartphone icon)
4. Theme Switch (Palette icon)
5. Settings (Settings icon)

## Required Branding
- Logo: Melora (not TFI)
- All text references should use "Melora"
