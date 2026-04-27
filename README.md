TODO: Matchup Page API Improvements

---

## ✅ COMPLETED — Model Trust System (End-to-End)

1. model_trust (Backend + UI + BigQuery)

{
"model_trust": {
"reasoning": {
"headline": "...",
"has_content": true,
"drivers": []
},
"matchup_advantage": {
"visible": true,
"away": 2,
"home": 4,
"leader": "home",
"tooltip": "..."
},
"edge": {
"strength": "moderate",
"score": 0.62,
"tooltip": "...",
"has_content": true
},
"signal_alignment": {
"summary_code": "mixed",
"summary_label": "...",
"aligned_count": 2,
"total_count": 4,
"tooltip": "...",
"signals": []
},
"learning_label": "..."
}
}

Notes:

- Backend owns all logic (no frontend derivation)
- Stored in BigQuery (outcomes + trust details)
- UI reads model_trust directly
- Section only renders when game_status is Final / Final-OT

---

## 🔜 NEXT — API IMPROVEMENTS

2. Improve game_profile (HIGH PRIORITY)

{
"game_profile": [
{
"category": "Pressure",
"level": "Elevated",
"level_index": 3,
"icon": "pressure",
"tilt_text": "BUF generating more pressure",
"tilt_team": "home"
}
]
}

Goal:

- Remove frontend string matching
- Improve signal alignment accuracy
- Standardize category + intensity handling

---

3. Add reasoning.summary (HIGH PRIORITY)

{
"reasoning": {
"headline": "...",
"summary": "...",
"drivers": []
}
}

Goal:

- Reduce duplication with Team Comparison
- Provide human-readable explanation
- Keep drivers as supporting evidence only

---

4. Improve team_comparison

{
"team_comparison": [
{
"label": "Red Zone TD %",
"away": 0.421,
"home": 0.358,
"better": "away",
"format": "percent",
"decimals": 1,
"formatted_gap": "42.1% vs 35.8%"
}
],
"team_comparison_period": "season"
}

Goal:

- Move formatting logic to backend
- Remove label-based guessing in frontend
- Ensure consistent display across UI

---

5. Improve matchup_lean

{
"matchup_lean": {
"target_team": "BUF",
"lean_summary": "...",
"focus_summary": "...",
"confidence": "Medium",
"confidence_tier": "medium",
"confidence_explanation": "...",
"confidence_context": "...",
"has_content": true
}
}

Goal:

- Remove frontend substring parsing
- Explain confidence clearly
- Align confidence with model_trust

---

6. Improve model_outcome

{
"model_outcome": {
"predicted_team": "BUF",
"predicted_side": "home",
"actual_winner": "BUF",
"result": "Correct",
"result_code": "correct",
"reason_tag": "Model aligned with pressure and turnover edge"
}
}

Goal:

- Remove regex logic from frontend
- Add structured evaluation explanation
- Strengthen feedback loop

---

7. Add matchup_breakdown (LOWER PRIORITY)

{
"matchup_breakdown": {
"disruption_risk": [],
"offensive_strength": [],
"defensive_control": [],
"finishing_ability": []
}
}

Goal:

- Provide deeper matchup insight
- Support betting/decision framework
- Build advanced analysis layer (post-MVP)

---

## 🧭 IMPLEMENTATION ORDER

Phase 1:

- game_profile
- reasoning.summary

Phase 2:

- team_comparison formatting
- matchup_lean confidence improvements

Phase 3:

- model_outcome enhancements
- matchup_breakdown

---

## 🧠 PRINCIPLE

All logic should live in the backend.
Frontend should only render structured fields.

No string matching.
No inferred logic.
No duplicated calculations.
