# UTAZÁSI DESIGN SYSTEM & BUILD SPECIFICATION v3.1

Version: 3.1
Status: Standalone Design System  
Purpose: Complete visual and interaction specification for rebuilding the interface from zero.

---

# 0. DOCUMENT PURPOSE

This document is the only visual reference required to build the interface.

A developer or AI coding agent must be able to create the product design without access to:
- previous conversations;
- screenshots;
- external design files;
- previous prototypes;
- repository history.

When a detail is not explicitly defined, choose the simplest solution that follows this system.

Do not create a new visual language for new screens.

---

# 1. DESIGN CHARACTER

The product character:

- calm;
- warm;
- Mediterranean;
- family-oriented;
- premium but not luxurious;
- simple before decorative;
- content before interface elements.

The interface should feel like a travel companion, not a dashboard.

Avoid:
- excessive cards;
- dense information panels;
- technical UI;
- unnecessary decoration;
- competing colors.

---

# 2. DESIGN TOKENS

## 2.1 Colors

## Primary palette

| Name | HEX | Usage |
|---|---|---|
| Quartz | #F8F7F3 | main background |
| Deep Sea | #18323B | primary text |
| Coral | #F18C79 | brand accent |
| Turquoise | #4CB8C4 | secondary accent |
| Turquoise Dark | #2E8A93 | icons/support text |
| Sand | #EFE7DA | secondary surface |
| Olive | #708A64 | contextual accent |

## Neutral colors

| Name | HEX |
|---|---|
| White | #FFFFFF |
| Light Surface | #F7F6F2 |
| Divider | #EEEAE2 |
| Medium Neutral | #B2ACA1 |
| Dark Neutral | #18323B |

---

## Opacity system

Use opacity instead of creating many colors.

```css
deep-sea-60 rgba(24,50,59,.60)
deep-sea-55 rgba(24,50,59,.55)
deep-sea-35 rgba(24,50,59,.35)
deep-sea-10 rgba(24,50,59,.10)

coral-20 rgba(241,140,121,.20)
coral-15 rgba(241,140,121,.15)
coral-10 rgba(241,140,121,.10)

turquoise-10 rgba(76,184,196,.10)
```

---

# 3. TYPOGRAPHY

## System UI Typography

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Utazási a felhasználó platformjának natív UI-tipográfiáját használja: Apple eszközön San Francisco / SF Pro, Androidon a natív Android UI-fontot, Windowson Segoe UI-t. A hierarchia méretből, súlyból, sorközből, betűközből, színből, opacityből és térközből épül; nincs display- vagy monospace fontcsalád.

Ne csomagoljunk SF Pro, Roboto, Segoe UI vagy más platformfontot. Minden aktív tipográfiai alias ugyanarra a System UI stackre mutat.

## Strict prohibition

Do not introduce Inter, Fraunces, IBM Plex Mono, bundled SF Pro, bundled Roboto, bundled Segoe UI, serif display fonts, decorative font families, feature-specific font families or monospace as a separate visual identity.

---

# 4. TYPE SCALE

## Hero title

14px  
line-height: 19px  
weight: 700

## Hero date

14px  
line-height: 19px  
weight: 500

## Main title

20–24px responsive  
line-height: 30px  
weight: 700  
letter-spacing: -0.03em

## Subtitle

14px  
line-height: 21px  
weight: 400

Color:
Deep Sea 60%

## Timeline title

17px  
line-height: 23px  
weight: 700

## Timeline metadata

13px  
line-height: 21px  
weight: 400

---

# 5. SPACING SYSTEM

Base unit: 4px

Tokens:

4
8
12
16
20
24
28
32
40
48
64

Primary page padding:

20px

Maximum mobile content width:

430px

---

# 6. GEOMETRY

## Radius

Small:
14px

Medium:
20px

Large:
28px

Pill:
9999px

---

## Shadows

Soft:

```css
0 6px 20px rgba(24,50,59,.06)
```

Glass:

```css
0 18px 44px rgba(43,41,38,.12),
0 2px 8px rgba(43,41,38,.05)
```

FAB:

```css
0 12px 28px rgba(217,99,57,.28)
```

---

# 7. LAYOUT SYSTEM

Mobile first.

Primary target:
375px width.

Maximum width:
430px.

Safe areas must always be respected.

Only these elements may be fixed:

- Bottom Navigation;
- Floating Action Button.

Everything else belongs to the vertical scroll.

---

# 8. HERO COMPONENT

Purpose:
Emotional location context.

Height:

204px + safe area.

Background:
location image.

Overlay:
dark readable gradient.

Logo:

- white logo;
- left aligned;
- large;
- decorative;
- not a button.

Right information:

Destination:
Szardínia

Date:
travel date

Rules:
- destination heavier than date;
- both aligned.

Forbidden:
- CTA buttons;
- weather tables;
- information blocks.

---

# 9. WEATHER BAR

Purpose:
Quick environmental information.

Style:
Floating glass surface.

Properties:

Radius:
22px

Blur:
20px

Background:

rgba(255,255,255,.78)

Content:

Only:
- icon;
- value.

Do not show metric labels.

Example:

24°
18°
4 km/h

---

# 10. JOURNEY STORY

Order:

1. Title
2. Day Picker
3. Subtitle

Everything centered.

No additional labels.

---

# 11. JOURNEY PICKER

Interaction:

Apple-style vertical/horizontal native picker feeling.

Rules:

- selected item always centered;
- maximum five visible items;
- no cards;
- no capsules;
- no borders;
- no shadows.

Focus:

Selected:
- large;
- dark;
- sharp.

Neighbours:
- smaller;
- lighter;
- blurred.

Motion:

- smooth;
- spring based;
- direct manipulation.

---

# 12. TIMELINE

Timeline is the main planning surface.

Not a card list.

Structure:

Time
|
Activity
|
Place
|
Description

Event spacing:

28px

Time:

13px

Title:

17px bold

Description:

14px.

---

# 13. EVENT TYPES

## Normal plan

Turquoise accent.

## Travel block

Subtle system-generated style.

## Local event

Coral accent.

Must be visually different from user-created plans.

---

# 14. BUTTON SYSTEM

## Floating Action Button

Only primary full coral element.

Size:

54x54px

Color:

#F18C79

Shape:

circle

---

## Normal button

Never full coral.

Style:

- coral border;
- 10–20% coral fill;
- dark text.

Height:

44–56px.

---

# 15. BOTTOM SHEET

Radius:

28px top corners.

Background:

#F8F7F3

Grabber:

40x6px

Content padding:

20px.

---

# 16. GLASS RULE

Glass is functional.

Allowed:
- Weather Bar;
- sheets;
- floating controls.

Forbidden:
- every card;
- every section;
- decorative glass panels.

---

# 17. ICON RULE

Icons:

- consistent line style;
- same visual weight;
- no emoji icons.

Sizes:

18px:
small data icons

24px:
main actions

---

# 18. MOTION

Timing:

Fast:
120–180ms

Standard:
180–250ms

Large:
250–350ms

Never animate without purpose.

Avoid:
- bounce;
- decorative movement;
- slow transitions.

Support reduced motion.

---

# 19. STATES

Every component requires:

Loading

Empty

Error

Offline

Success

Missing data:

Show:
—

Never invent values.

---

# 20. RESPONSIVE RULES

375px:
Primary design target.

390px:
No structural change.

430px:
Increase whitespace only.

Never:
- horizontal scrolling;
- compressed unreadable UI.

---

# 21. ACCESSIBILITY

Minimum touch target:

44px.

Maintain:
- readable contrast;
- visible states;
- keyboard accessibility where relevant.

---

# 22. AI DEVELOPMENT RULES

AI must:

- reuse existing components;
- use design tokens;
- avoid inventing new colors;
- avoid inventing new buttons;
- avoid inventing new card styles.

If a new pattern is needed:

1. identify closest existing component;
2. extend it;
3. only create a new pattern if unavoidable.

---

# 23. FINAL QUALITY CHECK

Before approving a screen:

✓ Uses the correct colors  
✓ Uses the correct typography  
✓ Uses existing spacing rhythm  
✓ Does not introduce new UI language  
✓ Works at 375px  
✓ Respects safe areas  
✓ Has loading/error/empty states  
✓ Feels like the same product  

END OF SPECIFICATION
