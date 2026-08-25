// Human-readable meaning for the six lenses.
//
// Lens names are product language; this file guarantees a plain-English
// definition is always available next to the name — in tooltips, destination
// copy, the Lens Explorer, the sticky context bar and focused headings.

export interface LensGlossaryEntry {
  key: string;
  name: string;
  /** One plain sentence describing what the lens measures. */
  definition: string;
  /** Sentence fragment used after "X's clearest strength is …". */
  strengthPhrase: string;
  /** Short football question the lens answers. */
  question: string;
}

export const LENS_GLOSSARY: Record<string, LensGlossaryEntry> = {
  explosiveness: {
    key: "explosiveness",
    name: "Explosiveness",
    definition: "Creating or preventing big gains and scoring opportunities.",
    strengthPhrase: "creating big gains and scoring opportunities",
    question: "Who generates the bigger plays?",
  },
  "drive-control": {
    key: "drive-control",
    name: "Drive Control",
    definition: "Sustaining possessions and moving the chains.",
    strengthPhrase: "sustaining drives and moving the chains",
    question: "Who keeps drives alive?",
  },
  "scoring-finish": {
    key: "scoring-finish",
    name: "Scoring Finish",
    definition: "Turning drives and scoring chances into points.",
    strengthPhrase: "turning scoring chances into points",
    question: "Who finishes drives with points?",
  },
  "defensive-resistance": {
    key: "defensive-resistance",
    name: "Defensive Resistance",
    definition: "Limiting opponent yards and points.",
    strengthPhrase: "limiting opponent yards and points",
    question: "Who gives up less?",
  },
  "disruption-protection": {
    key: "disruption-protection",
    name: "Disruption & Protection",
    definition: "Pressure, sacks, negative plays, and offensive protection.",
    strengthPhrase: "creating pressure and limiting negative plays",
    question: "Who wins in the backfield?",
  },
  "turnover-balance": {
    key: "turnover-balance",
    name: "Turnover Balance",
    definition: "Ball security and takeaways considered together.",
    strengthPhrase: "managing the turnover battle",
    question: "Who protects and takes the ball?",
  },
};

export function lensDefinition(lensKey: string): string {
  return LENS_GLOSSARY[lensKey]?.definition ?? "";
}

export function lensStrengthPhrase(lensKey: string): string {
  return LENS_GLOSSARY[lensKey]?.strengthPhrase ?? "";
}

export function lensQuestion(lensKey: string): string {
  return LENS_GLOSSARY[lensKey]?.question ?? "";
}
