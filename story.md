# Project Story: Pairing Mind logo picker

*Started 2026-11-10. Last updated 2026-11-10.*

<!-- storied-through: 2026-11-10T17:17:32Z @ c9129a4. First chapter. -->

---

## The Story So Far

A public six-step page lets Chad and Kyle choose the Pairing Mind logo one decision at a time: symbol finish, font, wordmark, lettering, spacing, then a light and dark review with SVG or PNG download. The address bar holds every pick, so a shared link reopens the same logo.

It was built in one session on Nov 10 and published on GitHub Pages from its own repo. The source lives here, and the Pages repo is a copy.

The choice itself hasn't been made yet.

---

## Big Learns & Breakthroughs

- **Break a design decision into single choices people can make in order.** *(2026-11-10)*
  Context: Rather than a gallery of finished logos, the picker asks one question per step and shows each option on light and dark. A later fix gave the font its own step.
  Evidence: [README](README.md), commits `9e4334e`, `73a5a92`.

---

## Chronological Chapters

### 2026-11-10: A logo chosen one step at a time

**What happened**

The logo needed founder sign-off, so the decision became a guided page instead of a set of mockups. It draws the existing symbol and converts the letters to outlines, so previews and downloads are the same drawing and need no fonts. The page went public on GitHub Pages, then the font got its own step and the script and styles were versioned so returning visitors see updates at once.

**DECIDED**

- Plain HTML, CSS and JavaScript, no build step. Fixed-weight font subsets cut to the letters in "pairing mind".
- Source here, published copy in its own repo, pushed with Jeff's OK.

**SHIFTED**

- Font moved from a sub-choice to its own step.

**LEARNED**

- A cached script hides an update. Versioning the file names on every change keeps reviewers on the latest page.

**Sources**

- [README](README.md), [live picker](https://kingside-group.github.io/pairing-mind-logo-picker/).
- Commits `9e4334e`, `4122b0d`, `73a5a92`, `c9129a4`.
