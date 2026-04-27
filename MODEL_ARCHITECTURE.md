# Model Architecture

Internal design document describing how the backend model works today and how it relates to (but is intentionally separate from) the NFL betting rubric.

---

## Overview

The current system is a **Matchup Explanation Engine** — not a full betting decision engine.

Its job is to explain *why* one team has an edge in a given matchup, using structured signals and a transparent reasoning layer. It does **not** decide whether a bet is eligible, sized, or worth placing. That responsibility belongs to a separate, future layer (the NFL Betting Rubric).

Keeping these two concerns separate is intentional and load-bearing for the architecture.

---

## Current System (Matchup API)

### Endpoint

```
GET /game/<game_id>
```

### Purpose

- Explain the matchup edge between two teams
- Surface the signals driving the model's lean
- Provide a transparent, auditable reasoning trail
- Track model outcomes for the learning loop

It does **not** produce a bet recommendation.

### Key Outputs

- **`game_profile`** — categorical matchup characteristics (pressure, pace, finishing, etc.) with intensity levels and tilt direction.
- **`matchup_lean`** — which team the model leans toward, with a confidence tier and explanation.
- **`model_outcome`** — post-game evaluation of the model's pick (correct / incorrect / push) with structured reasoning.
- **`model_trust`** — transparency layer: reasoning headline, matchup advantage, edge strength, signal alignment, and learning label.
- **`team_comparison`** — structured side-by-side metrics with backend-controlled formatting.

---

## NFL Betting Rubric (Future Layer)

The rubric is a **decision layer**, not an explanation layer. It determines whether a game or prop is *eligible* to bet — and under what conditions — based on a broader information set.

### Required Inputs

- **Print Media** — beat reporting, narrative context, qualitative signals
- **Injury Reports** — availability, designations, snap-count implications
- **High-Level Metrics** — team-level efficiency, situational performance
- **Core Area Metrics** — positional and unit-level matchup data
- **Market Context** — line movement, market consensus, pricing edge

The rubric consumes the Matchup API as one input among many — it does not replace it.

---

## Key Distinction

> **Matchup API = Explanation Layer**
> **Rubric = Decision Layer**

These two systems answer fundamentally different questions:

- *Explanation:* "Why does one team have an edge here?"
- *Decision:* "Should we bet this game, and how?"

Merging them prematurely would couple model reasoning to bet eligibility logic, making both harder to evolve, audit, and trust. They should remain independent until each layer is mature on its own.

---

## Future Direction

Two planned extensions illustrate where the system is heading.

### `matchup_simulation`

Forward-looking simulation output describing likely game shape and ranges.

```json
{
  "matchup_simulation": {
    "expected_margin": 3.4,
    "margin_range": [-2.1, 8.9],
    "win_probability": {
      "home": 0.61,
      "away": 0.39
    },
    "pace_estimate": "above_average",
    "script_summary": "Home likely controls early; pressure tilts late-game leverage."
  }
}
```

### `prop_eligibility`

Per-prop eligibility output, driven by the rubric layer (not the explanation engine).

```json
{
  "prop_eligibility": [
    {
      "player": "Josh Allen",
      "market": "passing_yards",
      "eligible": true,
      "reasoning": "Pressure edge + soft secondary + neutral market price",
      "confidence_tier": "medium",
      "rubric_inputs_satisfied": ["injury", "core_metrics", "market_context"]
    }
  ]
}
```

---

## Architecture Principle

> **Views feed the model.**
> **Python is the model.**

A clean separation of responsibilities between the data layer and the logic layer.

- **BigQuery views** — data preparation only. Joins, aggregations, normalization, and shaping. No scoring, no reasoning, no business logic.
- **Python** — the actual model. All logic, scoring, reasoning, evaluation, and the feedback loop live here.

This keeps SQL focused on *what the data is* and Python focused on *what it means*.

---

## Guiding Rules

- **All logic lives in the backend.** The frontend never derives model outputs.
- **Frontend only renders.** It displays structured fields exactly as provided.
- **No string matching.** Categories, tiers, and labels are explicit fields.
- **No inferred logic.** If the frontend needs a value, the backend must send it.
- **No duplicated calculations.** A given number is computed in one place, once.

These rules are non-negotiable and apply equally to the current Matchup API and the future Rubric layer.
