---
name: vibe-code-review
description: >
  Review AI-generated ("vibe-coded") web UIs and landing pages for design, UX, and quality pitfalls.
  Use this skill whenever the user shares a website, landing page, React component, or UI mockup for
  review — especially when it was built with AI assistance. Also trigger when the user asks Claude to
  generate frontend code or a landing page, so the output is self-reviewed before delivery. Covers
  animation abuse, branding consistency, mobile usability, interaction bugs, conversion focus, and
  originality. This skill should fire any time the user says "review my site", "check my landing page",
  "what do you think of this UI", "roast my design", "give feedback on this component", or shares a
  URL or screenshot of a web interface.
---

# Vibe Code Review Skill

A structured design + UX review framework for AI-assisted web development, derived from real-world
critique of vibe-coded sites. Use this to audit outputs before shipping, or to guide AI generation
from the start.

---

## Core Philosophy

AI is an assistant, not the final decision-maker. The shipped product must reflect a **thoughtful
human editor's perspective**. Use the time AI saves you to raise the bar on brand, messaging, and
polish — not to ship generic defaults faster.

> "Your credibility depends on attention to detail."

---

## The Review Checklist

Run through these categories in order. Flag every issue found, then prioritize fixes by user impact.

---

### 1. Brand & Identity First

Before reviewing anything else, ask: *Was brand defined before the AI generated code?*

- [ ] Is there a defined color palette being used consistently?
- [ ] Are brand guidelines (fonts, tone, logo usage) established and reflected?
- [ ] Does the site feel like *one* coherent brand, or like multiple AI sessions stitched together?
- [ ] Are icons and illustrations **custom / brand-aligned**, or generic system emojis and stock icons?

**Red flag:** Conflicting accent colors or jarring section-to-section design language shifts — a sign
that sections were "hallucinated" separately without a unifying brief.

**Fix:** Define color palette, typography, and brand goals *before* generating code. Use those
constraints to prompt the AI.

---

### 2. Animation & Motion

Animation should serve the user journey, not demonstrate technical capability.

- [ ] Does every animation have a **functional purpose** (guide attention, confirm action, show state)?
- [ ] Are there decorative elements (floating lines, ambient particles) that distract from the value prop?
- [ ] Does scroll behavior feel **natural**, or is the user being "scroll-jacked"?
- [ ] Does any CTA button follow the cursor or use excessive motion? *(Stop "button chasing")*
- [ ] Are there "build-out" animations that **prevent users from accessing content immediately**?
- [ ] Are there forced auto-scroll transitions the user didn't initiate?
- [ ] Does content reveal on scroll use **intersection observers** (not timers)?

**Rule:** If removing the animation makes the page *clearer*, remove it.

---

### 3. Originality & Avoiding AI Defaults

AI has aesthetic fingerprints. Actively avoid them.

- [ ] Are there excessive **purple/blue gradients** with no brand justification?
- [ ] Are there generic **fade-in scroll effects** on every section?
- [ ] Is the hero a **"bento box" grid** of feature tiles with no real hierarchy?
- [ ] Is the dashboard mockup a **four-color generic chart** unrelated to the actual product?
- [ ] Does the layout feel like it could belong to *any* SaaS company?

**Fix:** Use the time AI saves you to refine messaging and brand differentiation. Push the AI with
specific constraints: your exact palette, a reference site, a voice/tone guide.

---

### 4. Content & Information Architecture

- [ ] Is the **H1 + subtext + CTA above the fold**? The core mission must be immediately visible.
- [ ] Is critical information hidden behind hover states that mobile users can never reach?
- [ ] Is there excessive vertical white space that buries content? *(LLMs love padding)*
- [ ] Are FAQ or accordion sections **usable on load**, or broken by slow animations?
- [ ] Does the user know how far they are through long-form scroll sections?
- [ ] Is the page **skimmable** or does it feel like "scrolling through molasses"?

---

### 5. Navigation & Interaction Honesty

- [ ] Do all navigation elements have **stable, visible states** (no disappearing hover labels)?
- [ ] If something looks like a button, does it **act like a button**? No "head fakes."
- [ ] Are navigation anchors **intuitive**, not relying on non-standard motion patterns?
- [ ] Is the browser's native pointer cursor respected and enhanced, not obscured?
- [ ] Are there non-interactive UI elements that look interactive?

---

### 6. Typography & Readability

- [ ] Is all text **high-contrast** against its background? No light-on-light.
- [ ] Does a **video or dynamic background** compromise navigation legibility?
- [ ] Is font sizing consistent with a clear hierarchy (H1 > H2 > body > caption)?
- [ ] Are line lengths readable (ideally 60–80 characters per line for body text)?

---

### 7. Mobile & Accessibility

- [ ] Have all **hover-based interactions** been audited for mobile equivalents?
- [ ] Are touch targets large enough (minimum 44×44px)?
- [ ] Does the layout reflow gracefully, or does it break below 768px?
- [ ] Are CTA buttons reachable and tappable on mobile without obstruction?
- [ ] Does the site pass basic contrast ratios (WCAG AA: 4.5:1 for normal text)?

---

### 8. Asset Quality

- [ ] Are all hero images and media **high-resolution** (no blurry/pixelated assets)?
- [ ] Are images properly sized and optimized for web (not raw 4K exports)?
- [ ] Is placeholder content (Lorem Ipsum, generic stock photos) still present?

**Blurry assets = no human QA was done.** Always flag.

---

### 9. Interaction & Code Quality

- [ ] Have all **interactive elements been manually clicked/tested**, not just visually scanned?
- [ ] Are there horizontal layout shifts or overflow bugs?
- [ ] Do clicks register correctly across all states (hover, active, disabled)?
- [ ] Are there console errors or broken network requests?
- [ ] Does the layout hold up at edge-case viewport sizes (320px, 1440px+)?

**LLMs frequently output code with hidden interaction bugs that look fine in a static preview.**

---

### 10. Conversion & Purpose

Every design decision on a landing page must be evaluated through one lens: **does this help acquire
or convert a customer?**

- [ ] Is the primary CTA prominent, singular, and repeated at logical scroll points?
- [ ] Does the page answer "what is this, who is it for, why should I care" within 5 seconds?
- [ ] Are there unnecessary components that don't contribute to the conversion goal?
- [ ] Is the user's attention being respected, or scattered across competing elements?

---

## How to Deliver Feedback

When reviewing a site or component, structure your response as:

1. **Quick verdict** (1–2 sentences: overall quality signal)
2. **Critical issues** (must fix before shipping — broken interactions, unreadable text, missing CTA)
3. **Brand/originality issues** (things that make it feel generic or AI-default)
4. **Polish improvements** (nice-to-haves that elevate the quality)
5. **What's working** (genuine strengths to preserve)

Be specific: name the exact element, describe the problem, suggest the fix.

---

## When Generating UI (Pre-emptive Review)

If asked to *create* a landing page or UI component, apply this skill before outputting code:

1. Ask for (or establish) brand constraints first: palette, tone, reference sites
2. Default to **purposeful simplicity** over feature-rich genericism
3. Avoid all red-flag patterns listed above from the start
4. After generating, self-audit against the checklist before presenting the output
5. Flag any shortcuts taken and offer to refine them

---

## Quick Reference: AI Design Red Flags

| Pattern | Problem |
|---|---|
| Excessive purple/blue gradients | Generic AI aesthetic |
| Fade-in on every scroll section | Decorative, not functional |
| Floating ambient elements | Distracts from value prop |
| Button that follows cursor | Accessibility + annoyance |
| Content hidden behind hover | Breaks on mobile |
| Generic 4-color dashboard mockup | Doesn't represent real product |
| Bento box hero with no hierarchy | No clear message |
| Build-out animations on entry | Blocks content access |
| Light-on-light text | Unreadable |
| Blurry hero image | No human QA |
| Timer-based scroll reveals | Content held hostage |
| Scroll-jacking | Violates user autonomy |
| Multiple conflicting button styles | Incoherent interaction model |
| System emojis as icons | Lack of brand investment |
| Excessive vertical padding | Buries content, feels empty |
