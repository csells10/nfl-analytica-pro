# 🧠 Matchup API — Product Roadmap & Architecture

This document defines the current product direction, completed capabilities, and upcoming roadmap for the GameLens Matchup API and Matchup Page experience.

GameLens is being built as a backend-driven NFL matchup explanation system.

The goal is not just to show matchup data.  
The goal is to help users understand:

- which team has signal support
- how strong or weak that support is
- whether the broader profile confirms the lean
- when the matchup is actually balanced or mixed
- whether the model was correct after the game is final
- why a miss should be treated as a calibration issue or a true model weakness

The core product principle is:

Backend defines truth.  
Frontend displays it clearly.

---

# 🧭 SYSTEM OVERVIEW

## Current Purpose

The `/game/<game_id>` endpoint powers the GameLens matchup page.

It currently supports:

- matchup header
- final score
- Game Profile signals
- Core Area Advantage
- Matchup Lean
- Model Trust
- Model Outcome
- Team Comparison

The current product experience is an explanation layer.

It helps users understand how the model is reading a game, but it is not yet a betting decision engine.

---

## Current Product Boundary

The Matchup API should explain the matchup.

It should not yet:

- recommend bets
- place confidence around betting outcomes
- merge with the betting rubric
- behave like a prop betting engine
- overstate weak or mixed signals

The product should stay focused on clear matchup explanation first.

---

# ⚖️ KEY DISTINCTION

Matchup API = Explanation Layer  
Betting Rubric = Future Decision Layer

These should remain separate for now.

The Matchup API can eventually support a betting workflow, but only after the explanation layer is trustworthy, consistent, and easy to understand.

This prevents the app from jumping too quickly into recommendations before the model can clearly explain itself.

---

# 🧠 ARCHITECTURE PRINCIPLE

Views feed the model.  
Python is the model.  
Frontend renders the model.

This is the guiding system boundary.

---

## BigQuery Views

BigQuery should support the product by preparing clean, reusable inputs.

At the product level, BigQuery is responsible for:

- cleaned matchup inputs
- latest team metrics
- aggregate season metrics
- reusable data views
- normalized metric structure

BigQuery should not become the place where all product reasoning lives.

---

## Python Services

Python owns the matchup interpretation layer.

At the product level, Python is responsible for:

- signal scoring
- confidence rules
- Core Area interpretation
- Matchup Lean language
- Model Trust reasoning
- outcome evaluation
- feedback logging

This keeps model behavior centralized, testable, and easier to adjust.

---

## Frontend Responsibilities

The frontend is responsible for displaying the API response clearly.

The frontend should:

- render backend-provided wording
- display cards, labels, colors, bars, and sections
- make the page readable
- avoid clutter
- format structured context into human-readable text

The frontend should not:

- invent model logic
- hardcode matchup explanations
- parse strings to determine meaning
- overwrite backend-provided lean language
- render raw objects directly

---

# 🚫 GUIDING RULES

- Backend owns all matchup logic.
- Frontend renders structured fields.
- No frontend-generated model explanations.
- No fragile string matching.
- No duplicated calculations.
- No hardcoded “overall matchup edge” wording.
- No raw metric dump in the main UI.
- Do not overstate an edge when the matchup is split or nearly even.
- Confidence language should match the strength of the actual profile.

---

# ✅ COMPLETED — CORE SYSTEM

## 1. Model Trust System (End-to-End) ✅ COMPLETE

Model Trust is now a core part of the Matchup Page.

It explains how much trust the user should place in the model’s read after a game is final.

Model Trust currently includes:

- reasoning headline
- reasoning summary
- key drivers
- matchup advantage count
- edge strength
- signal alignment
- learning label
- model outcome context

### Key Outcomes

- Users can see whether the model was correct or incorrect.
- Incorrect outcomes are not treated generically.
- Misses can be explained as calibration issues when the matchup was balanced.
- The system now supports future learning loops.
- Frontend renders Model Trust directly from the backend.

---

## 2. Reasoning Summary (Explanation Layer) ✅ COMPLETE

The API now provides backend-owned reasoning language.

This includes:

- a headline
- a short summary
- driver statements

The reasoning layer explains what the model saw and how that related to the final outcome.

### Key Outcomes

- Removed frontend-generated explanation text.
- Reduced contradictory wording.
- Made model explanations more consistent.
- Allowed outcome-aware language for correct, incorrect, and no-pick games.
- Created better alignment between Matchup Lean and Model Trust.

### Result

The page can now tell a more honest story.

Example:

NO had a slight signal lean in a balanced matchup.

The model leaned NO, but the broader profile was close enough that the final result exposed a useful calibration miss.

---

## 3. Signal Alignment System ✅ COMPLETE

Signal Alignment explains whether the Game Profile signals agreed with the model’s predicted or leaned team.

It currently supports:

- all signals agreed
- mixed signals
- weak/disagreeing signals
- no-pick / not applicable states

### Key Outcomes

- Users can see whether the model’s lean was supported by the visible signals.
- No-pick scenarios are handled cleanly.
- Mixed-signal games are no longer presented as clean edges.
- Signal Alignment now uses backend-owned structured fields.

---

## 4. Game Profile — Backend Signal Ownership ✅ COMPLETE

Game Profile signals are now backend-owned.

The backend defines:

- category
- signal level
- icon
- tilt team
- tilt text

The frontend displays these signals without guessing what they mean.

### Key Outcomes

- Removed fragile frontend signal interpretation.
- Reduced category naming mismatch.
- Improved consistency between Game Profile and Matchup Lean.
- Created a stronger foundation for Core Area Advantage.

---

## 5. Frontend Alignment ✅ COMPLETE

The frontend now follows a backend-first display model.

### Changes

- Matchup Lean text renders directly from the API.
- Model Trust headline and summary render directly from the API.
- Tooltips render directly from the API.
- Core Area Advantage renders from API-provided scores.
- Core Area context is formatted into a human-readable supporting line.
- Raw objects are not rendered directly.

### Result

The frontend no longer tries to recreate model logic.

This keeps the product cleaner, safer, and easier to debug.

---

# ✅ RECENTLY COMPLETED — CORE AREA + MATCHUP LEAN ALIGNMENT

This was the most recent major product improvement.

The goal was to make the page stop overstating a matchup lean when the broader team profile is split or nearly even.

Previously, a game could show mixed Core Areas but still say one team had the “overall matchup edge.”

That is now fixed.

---

## Core Area Advantage ✅ COMPLETE

Core Area Advantage is now part of the Matchup Page.

It appears directly below Game Profile and above Matchup Lean.

It compares the teams across broader football categories instead of only individual metrics.

Current Core Areas include:

- Defensive Control
- Disruption and Turnovers
- Offensive Output
- Scoring Efficiency
- Field Control / Special Teams when usable data exists

### Objective

Give users a fast way to understand whether the matchup is broadly one-sided, split, or nearly even.

### User-Facing Value

Core Area Advantage helps users answer:

- Is one team stronger across the board?
- Are the teams split by category?
- Is the model lean supported by broader team strength?
- Is this actually closer to a coin flip?
- Why is confidence low?

This creates a bridge between raw metrics and human understanding.

### Frontend Display

The frontend uses compact Core Area cards.

Each card shows:

- Core Area name
- edge team
- away percentage
- home percentage
- metric count
- short context label
- compact split bar

Example display:

Defensive Control  
NO Edge  
SF 33%  
NO 67%  
6 metrics

### Important Learning From Testing

Core Area Advantage revealed an important product issue:

A team can have a directional signal lean while the broader Core Areas are split.

Example:

- NO leads Defensive Control
- NO leads Disruption and Turnovers
- SF leads Offensive Output
- SF leads Scoring Efficiency

That should not be described as a strong overall edge.

It should be described as a mixed or balanced matchup with a slight signal lean.

---

## Matchup Lean Refinement ✅ COMPLETE

Matchup Lean now uses Core Area context to avoid overstating the model’s read.

### Objective

Make Matchup Lean language more honest and better aligned with the broader matchup profile.

The model should distinguish between:

- true broader matchup edge
- slight signal lean
- mixed profile
- coin-flip profile
- conflicting profile
- no clear edge

### What Changed

Matchup Lean now considers whether Core Areas support, split, or conflict with the directional signal lean.

Instead of always saying:

NO holds the overall matchup edge

the API can now say:

This matchup is close overall, with a slight lean toward NO

or:

NO shows a slight signal lean, but the broader profile is mixed

or:

NO has signal support, but Core Areas do not fully confirm the edge

This is a major improvement in honesty and clarity.

### Profile Types

The product now supports the following profile concepts:

#### coin_flip_profile

Used when Core Area averages are nearly even.

User-facing meaning:

The game is close overall, even if one team has a slight signal lean.

#### split_profile

Used when both teams lead meaningful Core Areas.

User-facing meaning:

The matchup is mixed. The model may lean one way, but the broader profile is not clean.

#### confirmed_edge

Used when the signal lean and Core Area profile support the same team.

User-facing meaning:

The model has a stronger overall case.

#### conflicting_profile

Used when signal lean points one way but Core Areas do not fully support it.

User-facing meaning:

The model sees something, but the broader context says to be cautious.

#### no_clear_edge

Used when the signal gap is too small.

User-facing meaning:

The model should avoid forcing a lean.

### Result

Matchup Lean now sounds more calibrated.

For SF @ NO, the API correctly says:

This matchup is close overall, with a slight lean toward NO.

NO has the stronger signal score, but Core Areas are nearly even overall.

Core Areas were split 2–2 and nearly even overall.

Confidence: Low

---

## Model Trust Language Alignment ✅ COMPLETE

Model Trust now matches the refined Matchup Lean language.

### Objective

Prevent Model Trust from saying a team had the “cleaner matchup profile” when Matchup Lean says the broader profile was balanced.

### What Changed

Model Trust now uses the same profile context as Matchup Lean.

For balanced matchups, it can say:

NO had a slight signal lean in a balanced matchup.

For missed predictions in balanced games, it can say:

The model leaned NO, but the broader profile was close enough that the final result exposed a useful calibration miss.

### Result

The page now tells one coherent story.

For the SF @ NO golden test:

- Matchup Lean says slight lean.
- Core Areas say split and nearly even.
- Confidence says low.
- Model Outcome says incorrect.
- Model Trust says calibration miss.

That is the right product behavior.

---

## Tooltip Polish ✅ COMPLETE

Tooltip wording was updated to make the product clearer.

### What Changed

The old wording made some model fields sound broader than they really were.

The new wording explains what each section actually measures.

Updated tooltip concepts:

#### Matchup Advantage

Explains that the count is based on visible Team Comparison metrics.

It is not the full model score.

#### Edge Strength

Explains that the visible Team Comparison metrics show a small, moderate, or strong edge.

It should be treated as supporting context, not a standalone conclusion.

#### Signal Alignment

Explains whether each Game Profile signal agreed with the model’s predicted or leaned team.

### Result

Users are less likely to mistake a small metric count for the full model opinion.

This makes the explanation layer more transparent.

---

## Golden Test Case

The current regression test case is:

`/game/20250914_SF@NO`

This game is useful because it exposes the exact issue the recent update was designed to solve.

### Expected Behavior

Core Area Advantage:

- Defensive Control: NO edge
- Disruption and Turnovers: NO edge
- Offensive Output: SF edge
- Scoring Efficiency: SF edge

Core Area read:

- split 2–2
- nearly even overall

Matchup Lean:

This matchup is close overall, with a slight lean toward NO.

Focus Summary:

NO has the stronger signal score, but Core Areas are nearly even overall.

Supporting line:

Core Areas were split 2–2 and nearly even overall.

Confidence:

Low

Model Outcome:

- Predicted: NO
- Actual: SF
- Result: Incorrect

Model Trust headline:

NO had a slight signal lean in a balanced matchup.

Model Trust summary:

The model leaned NO, but the broader profile was close enough that the final result exposed a useful calibration miss.

Status:

Validated from the deployed Google Cloud URL and frontend.

---

## Status

Core Area Advantage: Complete  
Matchup Lean refinement: Complete  
Model Trust language alignment: Complete  
Tooltip polish: Complete  
Frontend display alignment: Complete

This phase is shippable.

---

# 🔜 PROPOSED — NEXT PHASES

The core explanation layer is now in a much stronger place.

The next work should focus on:

1. protecting the app
2. polishing display formatting
3. improving outcome explanations
4. adding lightweight historical context

---

# 🧭 PHASE 5 — AUTHENTICATION (USER ACCESS LAYER)

## Objective

Add a simple authentication layer so GameLens is not openly available to unrestricted public access.

The main product goal is to protect the app and reduce risk from public traffic.

Authentication should be lightweight and should not make the product feel heavy or enterprise-like.

---

## Recommended Approach

Use Google Sign-In through Firebase Authentication.

This fits the project well because:

- it works naturally with Google Cloud
- it supports Gmail login
- it keeps authentication familiar for users
- it avoids building custom login infrastructure too early

---

## High-Level Flow

1. User opens GameLens.
2. User signs in with Google.
3. App confirms authenticated session.
4. Authenticated user can access matchup pages.
5. Future features can use the signed-in user identity.

---

## Security Goals

- prevent anonymous scraping
- reduce unexpected Cloud Run / GCP cost exposure
- prepare for user-specific features later
- keep sign-in simple and familiar

---

## Design Considerations

The login experience should be:

- fast
- lightweight
- low-friction
- visually consistent with the app
- easy to understand

Avoid making the product feel locked down or complicated.

---

## Status

Not started.

Recommended next major phase.

---

# 🧭 PHASE 6 — DATA POLISH & ALIGNMENT

This phase improves display clarity and consistency.

It is important, but less urgent than authentication.

---

## Team Comparison Formatting

Goal:

Move display formatting decisions into the API.

The frontend should not need to guess:

- whether a number is a percent
- how many decimals to show
- how to format gaps
- whether higher or lower is better

Product value:

- cleaner UI
- fewer formatting inconsistencies
- easier future metric expansion
- better mobile readability

Status:

Not started.

Priority:

Low to medium.

---

## Model Outcome Depth

Goal:

Make postgame evaluation more explanatory.

Current Model Outcome tells:

- predicted team
- actual winner
- result

Future Model Outcome should explain:

- why the model was correct
- why the model missed
- whether the miss was understandable
- whether the miss exposed a real model weakness
- whether the model avoided a low-confidence game correctly

Product value:

- better learning loop
- better user trust
- clearer postgame review
- stronger foundation for future model improvement

Status:

Not started.

Priority:

Medium.

---

## Naming Cleanup

Some API names may be slightly broader than what they currently represent.

Example:

`matchup_advantage` currently counts visible Team Comparison metric wins.

The tooltip now explains this clearly, so this is not urgent.

Possible future rename:

`team_comparison_advantage`

Product value:

- clearer data contract
- easier future maintenance
- less confusion when adding more model layers

Status:

Optional future cleanup.

---

## Status

Data polish is not blocking the MVP.

Recommended after authentication unless a UI formatting issue becomes painful.

---

# 🧭 PHASE 7 — TEAM CONTEXT (PAST PERFORMANCE)

## Objective

Add lightweight recent performance context.

This would help users understand how each team has been performing leading into the matchup.

Possible context:

- recent games
- wins/losses
- opponent quality
- score trends
- recent form direction

---

## Frontend Direction

Keep this section lightweight.

Recommended display options:

- small strip
- compact card
- expandable section
- simple recent form summary

Avoid creating a large new analytics panel too early.

---

## Product Value

Team Context would help users answer:

- Is this team trending up or down?
- Was the recent performance against strong or weak opponents?
- Does the current matchup profile match recent results?
- Is the model leaning on stable trends or noisy recent outcomes?

This adds trust without overwhelming the page.

---

## Status

Not started.

Future phase.

---

# 🔮 FUTURE ENHANCEMENTS

## League-Relative Core Area Scoring

Current Core Area scoring is matchup-relative.

Future improvement:

Compare each team to league context.

Product value:

- stronger interpretation
- better cross-game comparisons
- clearer sense of whether a team is actually good or just better than this opponent

---

## Core Area Drilldowns

Allow users to expand a Core Area to see why that category favored a team.

Example:

Disruption and Turnovers could reveal:

- pressure profile
- turnover margin
- interceptions
- sacks
- related defensive signals

Product value:

- deeper transparency
- better trust
- optional detail without cluttering the main page

---

## Metric Weighting

Not every metric should matter equally forever.

Future scoring may weight metrics differently based on importance.

Product value:

- better model quality
- less distortion from noisy or low-value metrics
- stronger confidence calibration

---

## Historical Model Validation

Track model behavior over time.

Possible questions:

- How often are low-confidence leans correct?
- Are coin-flip profiles actually close to 50/50?
- Which Core Area patterns create the most misses?
- Does signal alignment predict outcome quality?
- Which profile types need calibration?

Product value:

- turns misses into product learning
- improves future confidence rules
- creates a real feedback loop

---

# ⚠️ KNOWN WATCHOUTS

## Core Area Scores Are Matchup-Relative

Current Core Area scores compare only the two teams in the game.

They do not yet say whether either team is strong compared to the entire league.

This is acceptable for the current version, but should be improved later.

---

## Metric Counts Are Uneven

Some Core Areas include more usable metrics than others.

Example:

- Offensive Output may have many metrics
- Defensive Control may have fewer
- Special Teams may sometimes have none

This is acceptable for v1, but future scoring may need balancing.

---

## Special Teams May Not Always Appear

Field Control / Special Teams only appears when usable data exists.

If all Special Teams values are empty or zero-vs-zero, the API may omit that Core Area.

This is intentional.

Do not force Special Teams into the UI unless the API returns it.

---

## Do Not Render Raw Objects in the Frontend

Structured objects must be formatted into readable text before rendering.

Example:

Do not render `core_area_context` directly.

Instead, display a human-readable sentence such as:

Core Areas were split 2–2 and nearly even overall.

This avoids React rendering errors and keeps the UI clean.

---

# 🎯 UPDATED PM RECOMMENDED ORDER

1. Phase 5 — Authentication with Google Sign-In
2. Phase 6 — Team Comparison formatting
3. Phase 6 — Model Outcome depth
4. Phase 7 — Team Context / Recent Form
5. Future — Core Area scoring improvements
6. Future — Historical model validation

---

# 🧭 FINAL OBJECTIVE

GameLens should become a clear, trustworthy matchup explanation engine.

The product should help users quickly understand:

- what the model sees
- which team has signal support
- whether broader team strengths confirm the lean
- how confident the model should be
- why the model was right or wrong
- what can be learned from misses

The final product direction is:

Backend defines truth.  
Frontend displays it clearly.  
Users understand the matchup instantly.  
Model misses become learning opportunities.  
Confidence stays honest.
