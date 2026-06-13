# Project: French Vocabulary Flashcard Reviewer (Browser-Based)

## Goal

Build a modern web application for learning and reviewing French vocabulary.

The application must run entirely in a web browser and be deployable as a static website or lightweight web app.

The primary focus is efficient vocabulary acquisition through high-quality flashcards, integrated dictionary lookup, pronunciation audio, and word exploration.

The design should feel similar to Anki, LingQ, and modern language-learning applications.

---

# Core User Story

As a French learner, I want to:

* Add new French words quickly.
* Automatically fetch definitions from online dictionaries.
* See pronunciation and phonetic transcription.
* Listen to natural-sounding audio.
* Review words using flashcards.
* Click any unfamiliar word inside a definition and instantly get its meaning.
* Build a growing personal vocabulary database.

---

# Technical Requirements

## Frontend

Use:

* React
* TypeScript
* Vite
* TailwindCSS
* shadcn/ui

The application must:

* Work on desktop
* Work on mobile
* Be responsive
* Support dark mode

---

## Backend

Use:

* Node.js
* Express
* TypeScript

Database:

* SQLite for local mode

Future upgrade path:

* PostgreSQL

Use Prisma ORM.

---

# Milestone 1: Basic Flashcard System

## Features

Create flashcard model:

```ts
{
  id: string
  word: string
  phonetic: string
  type: string
  definition: string
  examples: string[]
  audioUrl: string
  createdAt: Date
}
```

### Flashcard View

Front side:

* French word

Back side:

* Definition
* Word type
* Phonetic transcription
* Example sentences
* Audio button

### Navigation

* Next card
* Previous card
* Random card
* Flip card animation

### Acceptance Criteria

* User can create cards manually.
* User can browse cards.
* User can flip cards.

---

# Milestone 2: Dictionary Integration

## Goal

Automatically fetch data from online dictionaries.

### Priority Sources

1. WordReference
2. Wiktionary
3. Larousse (if legally accessible)
4. CNRTL
5. Reverso Context

If scraping is not allowed:

Use official APIs where available.

### When User Adds Word

Example:

```text
aborder
```

The system should automatically retrieve:

* Part of speech
* Definition
* IPA phonetics
* Example sentences
* Synonyms

### Acceptance Criteria

Typing:

```text
aborder
```

Automatically fills:

```text
Type: Verbe

Phonétique:
[a.bɔʁ.de]

Definition:
Commencer à traiter un sujet.

Example:
Nous avons abordé ce problème hier.
```

---

# Milestone 3: High-Quality Pronunciation Audio

## Goal

Avoid robotic speech.

### Preferred Sources

1. Google Translate TTS
2. Microsoft Edge Neural Voices
3. Azure Neural TTS
4. OpenAI TTS
5. Amazon Polly Neural

Must sound natural.

### Audio Features

* Play button
* Slow playback
* Normal playback
* Repeat playback

### Acceptance Criteria

User clicks speaker icon.

Natural French pronunciation plays instantly.

---

# Milestone 4: Interactive Definition Explorer

## Goal

Every word inside a definition should be clickable.

Example definition:

```text
Commencer à traiter un sujet.
```

User clicks:

```text
traiter
```

The application opens a panel below.

### Bottom Dictionary Panel

Displays:

```text
traiter

Type:
Verbe

Definition:
S'occuper de quelque chose.

Phonétique:
[tʁɛ.te]

Examples:
...
```

No page reload.

### Acceptance Criteria

Every meaningful French word becomes clickable.

Dictionary lookup occurs dynamically.

---

# Milestone 5: Smart Vocabulary Builder

## Goal

Add new words directly from dictionary lookups.

Example:

User clicked:

```text
traiter
```

Panel appears.

Button:

```text
+ Add to Flashcards
```

Creates new flashcard automatically.

### Acceptance Criteria

One-click vocabulary expansion.

---

# Milestone 6: Advanced Search

Search by:

* Word
* Definition
* Word type

Filters:

* Verbs
* Nouns
* Adjectives
* Adverbs
* Expressions

Sorting:

* Alphabetical
* Newest
* Most reviewed

---

# Milestone 7: Review Mode

Implement spaced repetition.

Algorithm:

* SM-2 (Anki style)

Buttons:

```text
Again
Hard
Good
Easy
```

Track:

```ts
easeFactor
interval
nextReviewDate
reviewCount
```

### Dashboard

Show:

* Due today
* Learned words
* New words
* Retention rate

---

# Milestone 8: French Sentence Support

Allow adding:

```text
Il faut aborder ce sujet avec prudence.
```

The system should:

* Tokenize sentence
* Make every word clickable
* Fetch dictionary data
* Allow adding any word to flashcards

---

# Milestone 9: Offline Dictionary Cache

Cache results locally.

Store:

```ts
word
definition
phonetic
audio
examples
```

Benefits:

* Faster lookup
* Reduced API calls
* Works offline for existing entries

---

# Milestone 10: Import & Export

Import:

* CSV
* JSON
* Anki format

Export:

* CSV
* JSON
* Anki-compatible format

---

# Milestone 11: Modern UX

Use:

* Framer Motion animations
* Smooth card flip
* Keyboard shortcuts

Keyboard:

Space:
Flip card

→:
Next card

←:
Previous card

A:
Again

G:
Good

E:
Easy

---

# Milestone 12: AI Assistant Features

Add AI-powered explanations.

For any word:

Generate:

* Simple French definition
* English translation
* Persian translation
* Usage notes
* Common mistakes
* Synonyms
* Antonyms

Example:

Word:
aborder

Output:

Meaning:
to approach

Persian:
پرداختن به / نزدیک شدن به

Common mistake:
Do not confuse with "accoster".

Synonyms:
traiter
entamer

Antonyms:
ignorer
éviter

---

# Final Desired Experience

The user opens the application.

1. Types a French word.
2. Dictionary information is fetched automatically.
3. Pronunciation is available instantly.
4. Flashcard is created.
5. Every word in definitions is clickable.
6. Clicking a word opens a mini-dictionary panel.
7. Any discovered word can be added to flashcards.
8. Review follows spaced repetition.
9. Data persists locally.
10. Everything works smoothly in any modern browser.

Build each milestone completely before moving to the next one.
Use clean architecture, reusable components, TypeScript types, and comprehensive documentation.
