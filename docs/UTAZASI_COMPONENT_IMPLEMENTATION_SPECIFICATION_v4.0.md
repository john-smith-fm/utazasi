# UTAZÁSI COMPONENT IMPLEMENTATION SPECIFICATION v4.1

Version: 4.1
Status: SELF-CONTAINED

Purpose: Exact component-level build specification for implementing the Utazási UI.

This document defines component hierarchy, dimensions, spacing, typography, colors, states, interactions, motion, responsive behaviour and AI UI patterns.

It is intended to be usable without previous project context.

---

# Component hierarchy

AppShell
- Hero
- MainContent
  - WeatherBar
  - SunRow
  - JourneyStory
    - JourneyPicker
  - Timeline
    - TimelineItem[]
- FloatingAddButton
- BottomNavigation
- BottomSheet
- FullScreenEditor
- ToastLayer
- ModalLayer

---

# Global rules

Mobile first.

Primary viewport: 375px.
Maximum mobile content width: 430px.

Colors:

Quartz #F8F7F3
Deep Sea #18323B
Coral #F18C79
Turquoise #4CB8C4
Turquoise Dark #2E8A93
Sand #EFE7DA
Olive #708A64

Typography:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Use native System UI typography on every platform. Apple devices resolve to San Francisco / SF Pro; Android and Windows keep their own native UI font. Do not bundle platform fonts or use a separate display/monospace family.

Strict prohibition: do not introduce Inter, Fraunces, IBM Plex Mono, bundled SF Pro, bundled Roboto, bundled Segoe UI, serif display fonts, decorative font families, feature-specific font families or monospace as a separate visual identity. All active typography aliases must resolve to the canonical System UI stack.

---

# Hero component

Purpose:
location emotion.

Height:
204px + safe area.

Contains:
- background image
- overlay
- logo
- destination
- date

Logo:
- white
- large
- left aligned
- decorative
- not interactive

---

# Weather Bar

Floating glass component.

Radius:
22px

Blur:
20px

Background:
rgba(255,255,255,.78)

Only display:
- icon
- value

No labels.

---

# Journey Picker

Purpose:
select travel day.

Rules:
- selected item always centered
- maximum five visible items
- no cards
- no borders
- no shadows

Selected:
large, dark, sharp.

Neighbours:
smaller, lighter, blurred.

Interaction:
- drag
- snap
- spring animation

---

# Timeline

Primary planning surface.

Not a card grid.

Structure:

Time
|
Node
|
Activity

Geometry:

Time column:
44px

Gap:
24px

Item spacing:
28px

Title:
17px bold

Metadata:
13px

Event types:

Plan:
Turquoise accent.

Travel:
subtle system style.

Local event:
Coral accent.

AI suggestion:
requires explicit user approval.

---

# Bottom Sheet

Radius:
28px

Background:
Quartz.

Grabber:
40x6px.

Padding:
20px.

---

# Full Screen Editor

Sections:

Title
Time
Duration
Place
Description

Save:
validate → persist → reorder → feedback.

---

# Buttons

FAB:

54x54px.

Background:
Coral.

Only primary full coral element.

Normal buttons:

- coral outline
- low opacity coral fill
- dark text

---

# Auth PIN screen

Background:
Quartz.

Contains:
- logo
- four digit picker
- login button
- status message

PIN picker:

Four fixed capsules.
Only numbers move.

Selected number:
centered.

Neighbours:
subtle blur and reduced opacity.

Button:
use standard button system.

---

# AI UI rules

AI never silently modifies plans.

Every suggestion shows:

Current state
Proposal
Reason
Impact
Actions

Avoid separate AI visual language.

---

# States

Every interactive component defines:

DEFAULT
PRESSED
FOCUSED
DISABLED
LOADING
ERROR
SUCCESS
OFFLINE

---

# Implementation rule

Build from this specification alone.

Do not invent new colors, typography, spacing systems, card styles or button systems.

When a missing case appears:
reuse the closest existing pattern.

END OF SPECIFICATION
