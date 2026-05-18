# KAGENARE — Zune-inspired Podcast Website Specification

## Project Goal

Redesign the KAGENARE podcast website into a:

- Zune-inspired
- Metro-influenced
- typography-first
- monochrome digital broadcast terminal

while keeping the project:

- static
- lightweight
- RSS-centered
- independent-platform-oriented

The website should feel like:

> a late-night digital broadcast system

rather than a generic podcast landing page.

---

# Core Design Direction

## Keywords

- signal detected
- transmission
- after midnight internet
- digital loneliness
- podcast terminal
- metro content blocks
- typography as interface
- RSS culture
- independent music software
- soft editorial minimalism

---

# Visual Philosophy

## DO

- large typography
- generous whitespace
- content blocks / tiles
- subtle motion
- monochrome layouts
- muted purple accent
- editorial readability
- soft contrast
- ambient digital atmosphere

## DON'T

- SaaS card UI
- startup gradients
- bright blue links
- excessive shadows
- fake retro skeuomorphism
- fake Windows 8 clone
- cyberpunk overload
- hacker-terminal parody

---

# Color System

## Main Background

Avoid pure black.

Recommended:

```css
background: #f3f0ea;
```

Alternative dark mode:

```css
background: #0a0a0a;
```

---

## Text

Avoid pure black.

```css
color: #202020;
```

Secondary:

```css
color: #666;
```

---

## Accent

Muted Zune-inspired purple:

```css
#7d72ff
```

Use ONLY for:

- active tile
- waveform
- hover state
- current episode
- small UI indicators

---

# Typography

## Style

Typography should dominate the layout.

Large headers.

Low information density.

Editorial rhythm.

---

## Suggested Fonts

### English

- Inter Tight
- Neue Haas Grotesk
- Space Grotesk
- Helvetica Now

### Japanese

- IBM Plex Sans JP
- Noto Sans JP

### Chinese

- Source Han Sans
- 思源黑体

---

# Site Structure

## Homepage = Broadcast Terminal

Homepage is the main experience.

No separate archive page.

---

## Documents = Archive Layer

Other pages become:

```txt
/documents/
/notes/
/signal/
```

Conceptually:

```txt
homepage = broadcast
documents = archive documents
```

---

# Layout

# Left Sidebar

Replace top navbar with fixed left sidebar.

Contents:

```txt
KAGENARE

podcast
幕前须知

listen
rss.xml
documents
about
signal
```

Lower section:

```txt
broadcasting from
somewhere
after midnight

● online

01:12 AM
2025.05.14
```

---

# Hero Area

Top area:

```txt
■ signal detected
```

Large typography:

```txt
KAGENARE
```

Supporting copy:

```txt
a podcast about idol culture,
music, and the things
we keep watching.
```

---

# Audio Player

Homepage should contain visible player.

Section label:

```txt
NOW PLAYING
```

Player includes:

- episode number
- title
- description
- waveform
- duration
- release date
- audio controls

Implementation:

```html
<audio controls preload="metadata">
```

is acceptable initially.

---

# Episode Menu

## Important

Episodes should NOT appear as:

- tables
- blog cards
- plain lists

Use:

> Metro / Zune-inspired tiles

---

# Tile Design

Each tile contains:

```txt
EP_014

幕前须知 #014

LIVE / FLOWERS / CROWD

58:12
```

Optional play button.

---

# Tile Behavior

Hover:

- subtle glow
- slight scale
- border highlight

Current episode:

- slightly brighter
- purple accent

---

# Tile Layout

Desktop:

- grid layout
- horizontal rhythm
- modular blocks

Mobile:

- stacked cards
- swipeable rows optional

---

# RSS Philosophy

RSS should be treated as a visible cultural object.

Expose:

```txt
rss.xml
```

directly in UI.

---

# RSS Features

Include:

- RSS URL
- copy button
- visible RSS identity

---

# Clipboard API

Use modern implementation:

```js
navigator.clipboard.writeText(rssLink)
```

Fallback:

```js
document.execCommand("copy")
```

---

# Podcast Data Architecture

Avoid heavy CMS initially.

Recommended structure:

```txt
episodes.json
```

Example:

```json
{
  "id": "EP_014",
  "title": "幕前须知 #014",
  "description": "关于ライブ、祝花与偶像现场的观察。",
  "audioUrl": "https://www.kagenare.com/audio/ep014.mp3",
  "duration": "58:12",
  "releaseDate": "2025-05-13"
}
```

---

# RSS Generation Workflow

## Goal

Semi-automatic RSS generation.

---

# Source Strategy

```txt
小宇宙 RSS
    ↓
metadata source

InfiniCloud
    ↓
audio hosting

local script
    ↓
merge metadata + self-hosted audio URLs

output
    ↓
rss.xml
```

---

# Audio Hosting

Use:

- InfiniCloud WebDAV
- Cloudflare Workers
- custom domain mapping

Audio URLs:

```txt
https://www.kagenare.com/audio/ep014.mp3
```

---

# RSS Generation

Recommended files:

```txt
episodes.json
scripts/build-rss.js
scripts/sync-xiaoyuzhou.js
rss.xml
```

---

# CMS Strategy

## Current Recommendation

Do NOT use heavy CMS yet.

Preferred:

```txt
episodes.json + markdown
```

---

# Future Option

If content volume grows:

- Decap CMS
- TinaCMS
- Sanity

But not required initially.

---

# Deployment Stack

## Frontend

Static HTML/CSS/JS

Optional future:

- Next.js
- Vercel

---

## Audio

InfiniCloud WebDAV

---

## Audio Mapping

Cloudflare Workers

---

## RSS

Self-generated rss.xml

---

# Design Inspirations

Not literal clones.

Inspirations include:

- Zune software
- Metro UI
- old Last.fm
- independent music blogs
- RSS-era internet
- Muji CD packaging
- Braun industrial design
- editorial magazine layouts

---

# Emotional Direction

The website should feel like:

```txt
a digital radio station
broadcasting after midnight
```

not:

```txt
a startup podcast platform
```

---

# Final Experience Goal

Users should feel:

- calm
- immersed
- curious
- reflective

The interface should disappear into:

- typography
- rhythm
- atmosphere
- transmission feeling
