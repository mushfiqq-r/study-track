# Design directions for Study Track

## Three possible directions

| Theme Name | Very Brief Intro | Probability |
|---|---|---:|
| Quiet Index | An editorial study desk that treats every study topic as a durable record, combining warm paper neutrals with purposeful ink-blue emphasis. It feels concentrated, calm, and personal rather than gamified. | 0.06 |
| Campus Signal | A crisp academic utility with bright colored subject signals, dense data views, and technical notebook details. It feels energetic and operational. | 0.04 |
| Night Library | A deeply shaded reading-room interface with copper accents and low-light contrast designed for focused evening planning. It feels atmospheric and reflective. | 0.08 |

## Chosen approach — Quiet Index

### Design Movement

**Editorial digital stationery** with quiet neo-skeuomorphic material cues. The application should resemble a carefully organized study ledger, not a generic dashboard.

### Core Principles

1. **Study clarity before decoration:** due work, completion state, and scheduled revisions are visually unambiguous.
2. **A durable desk metaphor:** warm page surfaces, hairline rules, and an index-like sidebar make data feel owned and orderly.
3. **Progress through rhythm:** revision stages use measured visual progress and short, predictable motion rather than attention-grabbing gamification.
4. **Local ownership:** the interface plainly communicates that data stays on-device and that the user controls backups.

### Color Philosophy

The app begins in **Ivory Ledger**, a softened paper background that lowers visual fatigue for extended planning. A deep **Ink Navy** provides authority and readable hierarchy, while an unmistakable **Terracotta Signal** guides the eye to the most important action or upcoming revision. Subject colors are restrained mineral tints instead of saturated category chips, so status remains more visually important than classification. Dark mode becomes a graphite reading surface with warm white type and the same terracotta signal, preserving the desk-like identity rather than inverting to generic black.

### Layout Paradigm

A persistent **rail-and-ledger** structure frames the app. On wide screens, a slim left rail handles navigation and quick status, while the main area flows as stacked ledgers: a current-focus strip, a controlled list of upcoming revisions, and an all-topics archive. On small screens, the rail becomes a compact top bar and a bottom action dock; the ledger sections remain a single forward reading flow.

### Signature Elements

1. **Margin marks:** a terracotta vertical rule and understated page-number-like labels punctuate key cards and headings.
2. **Revision beads:** six compact stage dots form a revision cadence for every topic; each bead becomes complete, due, or upcoming rather than relying on color alone.
3. **Paper cards:** softly elevated, square-leaning cards with a fine inner rule and a small metadata row create a tactile study-record feeling.

### Interaction Philosophy

Interactions should feel like moving a marker on a physical agenda: immediate, legible, and reversible. Quick actions are contextually adjacent to the relevant revision. Destructive actions require a confirmation. Importing validates the backup before touching saved data; export is explicit and portable. Keyboard navigation and visible focus states are first-class.

### Animation

Motion is used only to confirm structural changes. Cards enter with a 160–220ms opacity and upward transform transition, menus and drawers use 180–240ms transform/opacity transitions from their trigger, and status changes use a brief 140ms scale confirmation. No looping animation is used except a subtle offline pulse that is disabled under reduced-motion preferences. All animations use a snappy custom ease-out and are disabled or reduced where the operating system asks for it.

### Typography System

**DM Sans** provides clean, highly readable interface text and numerical metadata. **Fraunces** appears only in the product name, section titles, and empty-state messaging to bring editorial character. Headings are compact and slightly letter-spaced; body copy stays at comfortable reading size; labels use uppercase DM Sans with generous tracking.

### Brand Essence

**Study Track is a private, local-first revision desk for learners who want their spaced-repetition plan to stay clear, portable, and under their control.**

Personality: **considered, steady, capable**.

### Brand Voice

Headlines are concise, specific, and encouraging without being motivational theatre. CTAs use action verbs that identify the result. Microcopy explains local behavior plainly.

Example lines:

> “Your next review is already waiting.”

> “Save a portable copy of your study ledger.”

### Wordmark & Logo

The mark is an **open ledger leaf**: two offset rounded paper leaves divided by a single terracotta margin rule, creating a subtle forward arrow in the negative space. The wordmark combines a restrained Fraunces “Study” with a firm DM Sans “TRACK,” never a default browser font.

### Signature Brand Color

**Terracotta Signal — #C7654F.**

## Architecture notes

The application is a client-only React app and does not call online services. Topics and preferences are stored in `localStorage`; data can be exported as a JSON file and re-imported after schema validation. A minimal offline app shell (manifest and service worker) caches the interface after the first local load. The core record supports the original first study session and the five planned spaced revisions (1 hour, 25 hours, 8 days, 16 days, and 31 days), plus task state and an optional user-adjusted due time.

## Style Decisions

- On desktop, the persistent left rail remains a core part of every primary screen; a visible in-canvas desk index reinforces the rail-and-ledger structure in the work area.
- The wordmark uses Fraunces-like italic editorial styling for “Study” and tracked DM Sans uppercase for “TRACK,” paired with the open-ledger-leaf symbol and a terracotta divider.
- Terracotta Signal `#C7654F` is reserved for primary actions, due and active revision emphasis, and ledger margin marks; subject colors remain quiet mineral tints.
