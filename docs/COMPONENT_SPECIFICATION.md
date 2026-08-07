# UTAZÁSI COMPONENT IMPLEMENTATION SPECIFICATION v4.0

Version: 4.0  
Status: SELF-CONTAINED  
Purpose: Exact component-level build specification for implementing the Utazási UI from zero.

---

# 0. HOW TO USE THIS DOCUMENT

This file is standalone.

A developer or coding agent must be able to build the complete interface without access to:
- previous conversations;
- screenshots;
- external websites;
- repositories;
- design files;
- older prototypes;
- additional briefs.

This document defines:
- component hierarchy;
- exact dimensions;
- spacing;
- typography;
- colors;
- states;
- interaction;
- motion;
- responsive behavior;
- accessibility;
- AI-generated UI patterns.

If a case is not explicitly defined, derive it from the closest component pattern in this document.

Do not invent a new visual language.

---

# 1. GLOBAL DESIGN TOKENS

## 1.1 Colors

Primary background:

```text
Quartz
#F8F7F3
```

Primary text:

```text
Deep Sea
#18323B
```

Primary accent:

```text
Coral
#F18C79
```

Secondary accent:

```text
Turquoise
#4CB8C4
```

Strong turquoise:

```text
Turquoise Dark
#2E8A93
```

Warm secondary surface:

```text
Sand
#EFE7DA
```

Supporting green:

```text
Olive
#708A64
```

Neutral white:

```text
#FFFFFF
```

Neutral surface:

```text
#F7F6F2
```

Divider:

```text
#EEEAE2
```

Muted neutral:

```text
#B2ACA1
```

Semantic:

```text
Success  #6DAE72
Warning  #F6B34D
Error    #D96B6B
Info     #4CB8C4
```

## 1.2 Opacity tokens

```css
--deep-sea-60: rgba(24,50,59,.60);
--deep-sea-55: rgba(24,50,59,.55);
--deep-sea-35: rgba(24,50,59,.35);
--deep-sea-30: rgba(24,50,59,.30);
--deep-sea-15: rgba(24,50,59,.15);
--deep-sea-10: rgba(24,50,59,.10);

--coral-20: rgba(241,140,121,.20);
--coral-15: rgba(241,140,121,.15);
--coral-10: rgba(241,140,121,.10);
--coral-05: rgba(241,140,121,.05);

--turquoise-10: rgba(76,184,196,.10);
```

---

# 2. TYPOGRAPHY

## 2.1 Font families

Primary UI font:

```text
Inter
```

Weights:
- 400 Regular
- 500 Medium
- 600 SemiBold
- 700 Bold

Display font:

```text
Fraunces
```

Weights:
- 400
- 500
- 600
- 700

Monospace font:

```text
IBM Plex Mono
```

Weights:
- 400
- 500
- 600

## 2.2 Type tokens

### UI Display Small

```css
font-family: Inter;
font-size: 24px;
line-height: 30px;
font-weight: 700;
letter-spacing: -0.03em;
```

### UI Heading

```css
font-family: Inter;
font-size: 20px;
line-height: 26px;
font-weight: 700;
letter-spacing: -0.02em;
```

### Timeline Title

```css
font-size: 17px;
line-height: 23px;
font-weight: 700;
```

### Body

```css
font-size: 14px;
line-height: 21px;
font-weight: 400;
```

### Metadata

```css
font-size: 13px;
line-height: 21px;
font-weight: 400;
```

### Caption

```css
font-size: 11px;
line-height: 16px;
font-weight: 600;
```

### Button

```css
font-size: 15px;
line-height: 20px;
font-weight: 600;
```

---

# 3. SPACING SYSTEM

Base unit:

```text
4px
```

Allowed spacing values:

```text
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
```

Primary page horizontal padding:

```text
20px
```

Maximum mobile content width:

```text
430px
```

Primary target viewport:

```text
375px
```

---

# 4. RADIUS SYSTEM

Small:

```text
14px
```

Medium:

```text
20px
```

Large:

```text
28px
```

Full:

```text
9999px
```

---

# 5. SHADOW SYSTEM

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

Do not use decorative shadows beyond these patterns.

---

# 6. Z-INDEX SYSTEM

```text
0   background
10  standard content
20  sticky content
30  bottom navigation
40  floating add button
50  overlays
60  bottom sheet
70  full-screen editor
80  blocking modal / auth
```

Do not create arbitrary z-index values unless required for a proven collision.

---

# 7. APP SHELL

## 7.1 Root

Background:

```text
#F8F7F3
```

Text:

```text
#18323B
```

Font:

```text
Inter
```

Max content width:

```text
430px
```

Behavior:
- mobile-first;
- one vertical page scroll;
- no horizontal page scroll;
- safe areas respected;
- viewport-fit cover compatible.

## 7.2 Fixed elements

Only:
- Bottom Navigation;
- Floating Add Button.

Everything else belongs to normal vertical flow.

---

# 8. HERO COMPONENT

## 8.1 Purpose

Provides emotional location context.

## 8.2 Anatomy

```text
Hero
├── BackgroundImage
├── ColorOverlay
├── DarkGradient
├── Logo
└── DestinationBlock
    ├── DestinationName
    └── TravelDate
```

## 8.3 Dimensions

Height:

```css
calc(204px + env(safe-area-inset-top))
```

Horizontal padding:

```text
20px
```

Content gap:

```text
24px
```

## 8.4 Background

Image behavior:
- `background-size: cover`
- `background-position: 58% 52%`
- scale: `1.02`

Fallback:

```text
#2F6970
```

Color overlay:

```css
linear-gradient(
  135deg,
  rgba(29,93,101,.08),
  rgba(255,138,91,.04)
)
```

Dark lower gradient:

```css
linear-gradient(
  180deg,
  rgba(11,42,47,.06) 0%,
  rgba(11,42,47,.12) 45%,
  rgba(11,42,47,.64) 100%
)
```

## 8.5 Logo

Color:
white.

Rendered size:

```text
116 × 116px
```

Alignment:
left.

Object fit:
contain.

Must not function as a button.

## 8.6 Destination block

Destination:

```css
font-size: 14px;
line-height: 19px;
font-weight: 700;
color: rgba(255,255,255,.95);
```

Date:

```css
font-size: 14px;
line-height: 19px;
font-weight: 500;
color: rgba(255,255,255,.95);
```

Destination and date:
- vertically stacked;
- left aligned to each other.

## 8.7 Hero states

### Loading image
Use background fallback color and preserve layout.

### Image unavailable
Keep logo and text fully functional.

### Offline
Use last cached image if available; otherwise fallback background.

---

# 9. FLOATING WEATHER BAR

## 9.1 Purpose

Shows compact environmental data for the base location.

## 9.2 Anatomy

```text
WeatherBar
├── MetricItem
├── MetricItem
├── MetricItem
└── MetricItem
```

Each:

```text
MetricItem
├── Icon
└── Value
```

## 9.3 Geometry

Width:

```text
100%
```

Grid:

```text
4 equal columns
```

Radius:

```text
22px
```

Padding:

```text
8px vertical
6px horizontal
```

## 9.4 Glass

```css
background: rgba(255,255,255,.78);
border: 1px solid rgba(255,255,255,.82);
box-shadow:
  0 18px 44px rgba(43,41,38,.12),
  0 2px 8px rgba(43,41,38,.05);
backdrop-filter: blur(20px) saturate(1.08);
```

## 9.5 Metric

Icon:
- size 18px;
- stroke 1.8;
- color `#2E8A93`.

Value:

```css
font-size: 14px;
font-weight: 700;
letter-spacing: -0.02em;
```

Gap:

```text
6px
```

Column divider:

```css
1px solid rgba(24,50,59,.10)
```

## 9.6 Content rule

Show only:
- icon;
- value.

Do not show labels inside the compact bar.

Missing value:

```text
—
```

Never fabricate zero.

---

# 10. SUN ROW

## 10.1 Anatomy

```text
SunRow
├── Sunrise
├── BaseLocation
└── Sunset
```

## 10.2 Geometry

Margins:

```text
20px left/right
```

Grid:

```text
1fr auto 1fr
```

Gap:

```text
12px
```

Padding:
- horizontal 3px;
- top 12px;
- bottom 10px.

Bottom divider:

```css
1px solid rgba(24,50,59,.10)
```

## 10.3 Icons

Size:

```text
19px
```

Color:

```text
#F18C79
```

## 10.4 Time

```css
font-size: 14px;
font-weight: 600;
```

## 10.5 Center label

```css
font-size: 11px;
font-weight: 600;
letter-spacing: .02em;
color: rgba(24,50,59,.55);
```

---

# 11. JOURNEY STORY

## 11.1 Anatomy

```text
JourneyStory
├── Title
├── JourneyPicker
└── Subtitle
```

## 11.2 Spacing

Top margin:

```text
18px
```

Subtitle margin-top:

```text
8px
```

## 11.3 Title

```css
font-size: clamp(20px,5.8vw,24px);
line-height: 30px;
font-weight: 700;
letter-spacing: -0.03em;
text-align: center;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

## 11.4 Subtitle

```css
font-size: 14px;
line-height: 21px;
font-weight: 400;
color: rgba(24,50,59,.60);
text-align: center;
```

Width:

```text
calc(100% - 40px)
```

Max width:

```text
350px
```

Do not insert manual line breaks.

---

# 12. JOURNEY PICKER

## 12.1 Purpose

Select one day from the trip.

## 12.2 Data model

```ts
type JourneyDay = {
  date: string;
  day: number;
  weekday: string;
  title: string;
  subtitle?: string;
}
```

## 12.3 Abbreviations

```text
Hét
Kedd
Sze
Csü
Pén
Szo
Vas
```

`Vas` uses coral.

## 12.4 Geometry

Full control height:

```text
118px
```

Stage height:

```text
88px
```

Button width:

```text
64px
```

Horizontal spacing:

```text
64px
```

Button top:

```text
9px
```

Visible distance:

```text
<= 2.05 positions
```

Maximum visible:

```text
5 items
```

Selected item:
always geometrically centered.

No infinite loop.

At trip ends:
unused positions remain empty.

## 12.5 Styling

Selected date number:

```css
font-size: 32px;
font-weight: 700;
line-height: 1;
letter-spacing: -0.04em;
```

Weekday:

```css
font-size: 13px;
font-weight: 500;
line-height: 1;
margin-top: 3px;
```

Forbidden:
- card;
- capsule;
- background;
- border;
- shadow.

## 12.6 Motion

Position:

```js
left = distance * 64
```

Scale:

```js
0.68 + 0.52 * Math.max(0, 1 - absDistance / 2)
```

Opacity:

```js
Math.max(0.12, 1 - absDistance * 0.34)
```

Blur:

```js
Math.min(2.5, absDistance * 1.15)
```

Spring:

```js
velocity = (velocity + (target - position) * 0.12) * 0.82
```

## 12.7 Interaction state machine

```text
IDLE
↓ pointer down
DRAGGING
↓ pointer move
DRAGGING_UPDATE
↓ pointer up
SNAP_TO_NEAREST
↓ animation complete
SELECTED
```

Tap:
select exact day.

Drag:
update position continuously.

---

# 13. TIMELINE

## 13.1 Purpose

Primary daily planning surface.

## 13.2 Anatomy

```text
Timeline
└── TimelineItem[]
```

Each:

```text
TimelineItem
├── Time
├── Rail
├── Node
└── Content
    ├── TitleRow
    │   ├── Title
    │   └── OptionalChevron
    ├── Place
    ├── OptionalRecommendation
    └── OptionalMeta
```

## 13.3 Container rail

```css
left: 55px;
top: 16px;
bottom: 24px;
width: 1px;
background: rgba(24,50,59,.10);
```

## 13.4 Item geometry

```css
grid-template-columns: 44px 1fr;
column-gap: 24px;
margin-bottom: 28px;
```

## 13.5 Time

```css
font-size: 13px;
line-height: 21px;
font-weight: 400;
color: rgba(24,50,59,.55);
padding-top: 2px;
```

## 13.6 Node

Position:

```text
left: 51px
top: 8px
```

Size:

```text
9 × 9px
```

Border:

```text
2px Quartz
```

Normal:

```css
background: #4CB8C4;
box-shadow: 0 0 0 1px rgba(20,127,145,.25);
```

Local event:

```css
background: #F18C79;
box-shadow: 0 0 0 4px rgba(241,140,121,.14);
```

## 13.7 Title

```css
font-size: 17px;
line-height: 23px;
font-weight: 700;
color: #18323B;
```

## 13.8 Place

```css
margin-top: 4px;
font-size: 14px;
line-height: 20px;
color: rgba(24,50,59,.60);
```

## 13.9 Chevron

Size:

```text
18px
```

Color:

```text
Deep Sea 30%
```

---

# 14. TIMELINE ITEM TYPES

## 14.1 Plan Item

Accent:
Turquoise.

Editable:
yes unless explicitly locked.

## 14.2 Travel Item

Purpose:
system-generated travel segment.

Recommended visual:
- same timeline geometry;
- subdued typography;
- no large card;
- system-generated flag is not shown as technical metadata.

Example content:

```text
17:40
Indulás
XX perc utazás
```

## 14.3 Local Event Item

Background:

```text
Coral 10%
```

Padding:

```text
12px
```

Radius:

```text
16px
```

Title:
Coral.

Label:

```text
Helyi esemény
```

Chip:
- Coral 15% background;
- Coral text;
- 11px bold.

## 14.4 AI Suggestion Item

Do not silently insert as an accepted normal plan.

It must clearly communicate:
- current plan;
- suggested change;
- reason;
- impact.

See AI UI section.

---

# 15. TIMELINE ITEM STATES

## Default

Normal appearance.

## Selected

May use subtle surface tint or editor transition.
Do not over-card the item.

## Editing

Handled by Bottom Sheet or Full Screen Editor.

## Conflict

Show:
- small coral warning;
- concise text;
- no automatic blocking unless product logic requires it.

## Disabled

Reduce interactive affordance.
Keep readable.

---

# 16. ACTIVITY BOTTOM SHEET

## 16.1 Purpose

Quick edit / quick selection.

## 16.2 Anatomy

```text
BottomSheet
├── Grabber
├── Header
│   ├── Meta
│   ├── Title
│   └── Close
├── Body
│   └── Options
└── Footer
    ├── Cancel
    └── Save
```

## 16.3 Geometry

Max width:

```text
430px
```

Top radius:

```text
28px
```

Background:

```text
#F8F7F3
```

Safe area:
bottom aware.

## 16.4 Grabber

```text
40 × 6px
```

Color:

```text
Deep Sea 15%
```

Shape:
pill.

## 16.5 Header

Horizontal padding:

```text
20px
```

Bottom padding:

```text
16px
```

Divider:

```text
Deep Sea 10%
```

Meta:

```text
12px semibold
Deep Sea 55%
```

Title:

```text
20px bold
```

## 16.6 Body

Padding:

```text
20px
```

Options:
- radius 16px;
- padding 12px;
- 8px vertical gap.

Unselected:

```text
border Deep Sea 10%
```

Selected:

```text
border Coral
background Coral 5%
```

## 16.7 Footer

Two equal buttons.

Gap:

```text
12px
```

Top border:

```text
Deep Sea 10%
```

---

# 17. FULL SCREEN EDITOR

## 17.1 Purpose

Detailed activity editing.

## 17.2 Layout

Full viewport.

Background:

```text
#F8F7F3
```

Safe-area aware header.

## 17.3 Anatomy

```text
FullScreenEditor
├── Header
│   ├── Back
│   ├── Title
│   └── Save
├── ScrollContent
│   ├── ActivityTitleInput
│   ├── TimeField
│   ├── DurationField
│   ├── PlaceField
│   ├── DescriptionField
│   └── OptionalSystemInfo
└── DestructiveArea
    └── Delete
```

## 17.4 Header height

Recommended:

```text
56px + safe area
```

## 17.5 Field spacing

Vertical field gap:

```text
20px
```

Section gap:

```text
32px
```

## 17.6 Save behavior

On save:
1. validate;
2. persist;
3. close editor;
4. reorder Timeline by start time;
5. show subtle success feedback.

Do not silently apply unrelated AI changes.

---

# 18. BUTTON SYSTEM

## 18.1 Floating Add Button

Size:

```text
54 × 54px
```

Position:

```css
right: 20px;
bottom: calc(88px + env(safe-area-inset-bottom));
```

Background:

```text
#F18C79
```

Text/icon:

```text
#18323B
```

Radius:
full circle.

Icon:
plus, 24px, stroke 2.

Shadow:

```css
0 12px 28px rgba(217,99,57,.28)
```

Pressed:

```css
transform: scale(.95)
```

## 18.2 Standard Button

Height:

```text
44–56px
```

Default:
- coral outline;
- coral 10–20% fill;
- deep-sea text;
- radius 14–20px;
- semibold.

## 18.3 Disabled

Opacity:

```text
40–50%
```

No shadow escalation.

## 18.4 Loading

Keep exact button size.
Replace content with inline loader.
Do not change layout width/height.

## 18.5 Destructive

Use error color sparingly.

Preferred:
outline / low-opacity fill,
not a dominant full-red block.

---

# 19. INPUT SYSTEM

## 19.1 Base field

Minimum height:

```text
48px
```

Radius:

```text
14px
```

Border:

```text
Deep Sea 10%
```

Background:

```text
White or Light Surface
```

Horizontal padding:

```text
14–16px
```

Text:

```text
14–16px Inter
```

## 19.2 Focus

Border:
Turquoise Dark or Coral depending semantic context.

Do not add strong glow.

## 19.3 Error

Border:
Error.

Helper:
12px error color.

## 19.4 Text input

Use for:
- activity title;
- place fallback;
- short free text.

## 19.5 Time picker

Prefer native mobile time selection where appropriate.

Display:
24-hour format.

## 19.6 Duration picker

Use compact picker or segmented option sheet.

Examples:

```text
30 perc
45 perc
60 perc
90 perc
Egyéni
```

## 19.7 Place selector

Display:
- current place;
- optional recommendation;
- chevron.

Opens:
Bottom Sheet or search view.

---

# 20. BOTTOM NAVIGATION

## 20.1 Position

Fixed bottom.

Safe-area aware.

z-index:

```text
30
```

## 20.2 Rules

Exactly one bottom navigation.

Do not duplicate it inside screens.

Content must have enough bottom padding so last Timeline item remains visible.

## 20.3 Icons

Single line-icon family.

Active:
Deep Sea / stronger accent.

Inactive:
Deep Sea 55%.

Labels:
small and secondary.

---

# 21. GLASS SURFACE SYSTEM

Allowed:
- Weather Bar;
- Bottom Navigation when useful;
- floating contextual controls;
- popovers.

Not allowed:
- every Timeline item;
- every content section;
- Hero container;
- generic cards.

Default blur:

```text
16px
```

Weather Bar:

```text
20px
```

---

# 22. ICON SYSTEM

Use one coherent line-icon family.

Recommended sizes:

```text
16px minor
18px standard
20px medium
24px primary action
```

Stroke:

```text
1.8–2
```

Do not use emoji as standard UI icons.

---

# 23. MOTION TOKENS

Fast:

```text
120–180ms
```

Standard:

```text
180–250ms
```

Large spatial:

```text
250–350ms
```

Use motion only for:
- selection;
- continuity;
- direct manipulation;
- state change.

Do not use:
- playful bounce;
- decorative wobble;
- animated blur;
- slow transitions.

Support reduced motion.

---

# 24. GLOBAL STATES

Every network-backed component must define:

```text
LOADING
SUCCESS
EMPTY
PARTIAL
ERROR
OFFLINE
```

## Loading

Preserve layout geometry.

Use subtle placeholder or spinner.

## Empty

Explain what is missing.
Offer action only if meaningful.

## Partial

Render available data.
Use `—` for missing values.

## Error

Concise human message.
Retry if possible.

## Offline

Show cached content if available.
Indicate offline status subtly.

Never fabricate data.

---

# 25. AUTH / PIN SCREEN

## 25.1 Purpose

Minimal access screen.

## 25.2 Content

Only:
- logo;
- PIN picker;
- login button;
- optional status message.

No marketing copy.
No extra cards.

## 25.3 Background

```text
#F8F7F3
```

## 25.4 PIN picker

Four fixed capsules.

Each capsule:
- fixed in place;
- only number wheel moves;
- selected number centered;
- one previous and one next number visible;
- neighbours lighter and slightly blurred;
- further numbers hidden.

Capsule:
- near-white;
- medium radius;
- subtle soft shadow.

Interaction:
vertical drag,
snap to nearest number.

## 25.5 Login button

Use Standard Button pattern.
Do not use full coral fill.

---

# 26. AI SUGGESTION UI

## 26.1 Principle

AI never silently changes the plan.

AI UI must communicate:
1. current state;
2. proposal;
3. reason;
4. impact;
5. explicit user choice.

## 26.2 Anatomy

```text
AISuggestion
├── Label
├── ProposedChange
├── Reason
├── Impact
└── Actions
    ├── Accept
    └── KeepCurrent
```

## 26.3 Visual style

Do not create a new AI-specific palette.

Use:
- Quartz;
- Deep Sea;
- Turquoise;
- Coral for warning/impact only.

Avoid:
- neon gradients;
- purple AI styling;
- sparkles as dominant visual language.

## 26.4 Example

```text
Javaslat

Strand indulás
09:30 → 10:00

Miért?
Délelőtt erősebb szél várható.

Hatás
+30 perc nyugodtabb reggel

[Megtartom] [Elfogadom]
```

---

# 27. AI CHANGE PREVIEW

Before applying multiple changes:

```text
ChangePreview
├── ChangedItems[]
├── Reasons[]
├── ImpactSummary
└── ConfirmActions
```

Changed items must visually show:
- before;
- after.

Do not hide consequences.

---

# 28. CONFLICT UI

If events overlap:

Show:
- small coral warning;
- concise text;
- affected time range.

Default behavior:
warning only.

Do not automatically move events unless planning logic explicitly requests it.

---

# 29. DELETE + UNDO

Delete may be triggered by swipe or editor action.

Default:
hard delete.

Immediately after delete:

```text
Esemény törölve
[Visszavonás]
```

Undo window:

```text
5 seconds
```

Toast must not cover bottom navigation or FAB.

---

# 30. RESPONSIVE BEHAVIOR

## 375px

Primary reference.

All dimensions defined above must fit.

## 390px

No structural change.

Allow slightly more breathing room.

## 430px

Use max width.
Do not scale components disproportionately.

## Tablet

Center mobile content column.
Do not transform the product into a dashboard grid automatically.

---

# 31. ACCESSIBILITY

Minimum touch target:

```text
44 × 44px
```

Requirements:
- readable contrast;
- meaningful button labels;
- keyboard accessibility for editable controls;
- focus states;
- reduced motion;
- semantic headings;
- dialogs marked as modal;
- destructive actions labeled clearly.

---

# 32. PWA / SAFE AREA RULES

Always account for:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Fixed bottom elements must remain above the Home indicator.

No important content may be hidden behind:
- bottom navigation;
- FAB;
- notch / Dynamic Island.

---

# 33. COMPONENT STATE CONTRACT

Every interactive component should define:

```text
DEFAULT
PRESSED
FOCUSED
DISABLED
LOADING
ERROR
SUCCESS
```

Not all states need distinct decoration, but behavior must be defined.

---

# 34. IMPLEMENTATION HIERARCHY

Recommended component tree:

```text
AppShell
├── Hero
├── MainContent
│   ├── WeatherBar
│   ├── SunRow
│   ├── JourneyStory
│   │   └── JourneyPicker
│   └── Timeline
│       └── TimelineItem[]
├── FloatingAddButton
├── BottomNavigation
├── BottomSheet
├── FullScreenEditor
├── ToastLayer
└── ModalLayer
```

---

# 35. DESIGN INVARIANTS

These rules must never change without explicit redesign approval:

1. Quartz is the base background.
2. Deep Sea is the primary text color.
3. Coral is the strongest brand accent.
4. Full coral is primarily reserved for FAB.
5. Inter is the primary UI font.
6. Page horizontal padding is 20px.
7. Main mobile max width is 430px.
8. Journey Picker selected item stays centered.
9. Journey Picker has no card/capsule/border/shadow.
10. Timeline is linear and typography-led.
11. Glass is functional, not decorative.
12. New screens inherit this system rather than inventing a new one.

---

# 36. BUILD CHECKLIST

Before a component is complete:

- uses exact palette;
- uses exact font family;
- uses allowed radius;
- uses allowed spacing;
- no unnecessary container;
- no accidental full-coral button;
- no horizontal overflow;
- 375px layout works;
- safe areas work;
- loading state exists;
- empty state exists if applicable;
- error state exists;
- offline state exists if applicable;
- touch targets >=44px;
- reduced motion supported;
- interaction state is defined;
- component visually belongs to the system.

---

# 37. FINAL BUILD RULE

Build from this document alone.

Do not rely on assumed previous design knowledge.

If a necessary element is not described:
- first reuse the closest existing component pattern;
- keep the same palette, typography, spacing, radius and motion system;
- choose the least decorative solution;
- do not create a new visual language.

END OF SPECIFICATION
