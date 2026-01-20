# IMPLEMENTATION RULES – MELORA TUNES

## Core Rules (Never Break)
1. **One repo, one codebase** (NO separate mobile folder).
2. **Same components and files** for Desktop and Mobile.
3. **NO CSS scale(), NO shrinking desktop UI**.
4. **NO duplicated Deck / Discovery / iPod logic**.
5. **Themes are visual-only** (no density or visibility logic).

## Mobile Strategy (Locked)
- **iPod Mode**: Same UI everywhere.
- **Discovery Mode**: Responsive grid only.
- **Deck Studio**: **COMPLETELY HIDDEN**.
  - No access routes, menus, or options on mobile.
  - Never render DeckStage on mobile.
  - Desktop behavior remains strict and unchanged.

## Safety Guardrails (Mandatory)
- **Minimum touch target ≈ 48dp**.
- **Automatic fallback only** (no user toggle).
- **Desktop behavior must NEVER change**.
- **Deck Studio code must NOT be deleted** (Desktop only).

## Change Policy
- Before any future change, you must review this file.
- If a proposed change violates any rule here, you must STOP and ask before implementing.
