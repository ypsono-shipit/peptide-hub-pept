/**
 * Plain-language education cards for GLP-1 / multi-agonist peptides.
 * Not medical advice — research / education only.
 */

export type LearnCard = {
  id: string;
  title: string;
  emoji: string;
  items: string[];
};

export type PeptideLearn = {
  id: "sema" | "tirz" | "reta";
  short: string;
  fullName: string;
  aka: string;
  tagline: string;
  color: "green" | "sky" | "violet";
  /** One-line “what is this?” */
  inPlainEnglish: string;
  /** Mechanism in simple words */
  howItWorks: string;
  cards: LearnCard[];
  funFact: string;
};

export const LEARN_DISCLAIMER =
  "Education only — not medical advice, not a diagnosis, not a dosing guide. Prescription medicines (Ozempic®, Wegovy®, Mounjaro®, Zepbound®, etc.) are for use under a licensed clinician. Research compounds are for laboratory use only and are not for human consumption.";

export const PEPTIDE_LEARN: PeptideLearn[] = [
  {
    id: "sema",
    short: "SEMA",
    fullName: "Semaglutide",
    aka: "GLP-1 · Ozempic® / Wegovy® class",
    tagline: "The original mainstream weekly shot for sugar + scale",
    color: "green",
    inPlainEnglish:
      "A lab-made version of a gut hormone (GLP-1) that tells your body “you’re full” and helps control blood sugar.",
    howItWorks:
      "It turns up GLP-1 receptors → more insulin when sugar is high, less glucagon, slower stomach emptying, quieter “food noise” in the brain.",
    funFact:
      "One weekly injection is enough for many people because the molecule was engineered to stick around for days — not hours.",
    cards: [
      {
        id: "helps",
        title: "How it can help",
        emoji: "✨",
        items: [
          "Lowers blood sugar in type 2 diabetes",
          "Supports significant weight loss at higher doses",
          "Reduces appetite and snacking urges for many people",
          "Some products studied for heart-risk benefits in indicated patients",
        ],
      },
      {
        id: "sides",
        title: "Common side effects",
        emoji: "🌊",
        items: [
          "Nausea (often worst when starting or increasing dose)",
          "Vomiting, diarrhea, or constipation",
          "Feeling full quickly / less interest in food",
          "Fatigue or “meh” energy while adjusting",
        ],
      },
      {
        id: "risks",
        title: "Bigger risks to know",
        emoji: "⚠️",
        items: [
          "Pancreatitis (rare) — severe belly pain needs urgent care",
          "Gallbladder problems in some people",
          "Dehydration if GI symptoms are rough",
          "Class warning on thyroid C-cell tumors (rodent data) — discuss personal risk with a doctor",
          "Not for everyone (e.g. certain thyroid/endocrine histories — clinician call)",
        ],
      },
    ],
  },
  {
    id: "tirz",
    short: "TIRZ",
    fullName: "Tirzepatide",
    aka: "Dual GIP + GLP-1 · Mounjaro® / Zepbound® class",
    tagline: "Two gut-hormone pathways in one weekly shot",
    color: "sky",
    inPlainEnglish:
      "Like semaglutide’s GLP-1 idea — plus a second hormone path (GIP). Many people see even stronger effects on weight and sugar.",
    howItWorks:
      "Hits both GIP and GLP-1 receptors → insulin response, appetite, and metabolic signaling get a dual nudge instead of one.",
    funFact:
      "It’s often nicknamed a “twincretin” because it wears two incretin hats at once.",
    cards: [
      {
        id: "helps",
        title: "How it can help",
        emoji: "🚀",
        items: [
          "Powerful A1C / blood-sugar control in type 2 diabetes",
          "Often large average weight loss in weight-management trials",
          "Appetite suppression similar to (and sometimes stronger than) single GLP-1s",
          "One weekly injection schedule for approved products",
        ],
      },
      {
        id: "sides",
        title: "Common side effects",
        emoji: "🎢",
        items: [
          "Nausea, vomiting, diarrhea — especially early on",
          "Constipation or bloating",
          "Reduced appetite that can feel “too strong” at first",
          "Injection-site reactions (usually mild)",
        ],
      },
      {
        id: "risks",
        title: "Bigger risks to know",
        emoji: "⚠️",
        items: [
          "Same serious GI / pancreatitis / gallbladder themes as other incretins",
          "Hypoglycemia risk rises if stacked with insulin or sulfonylureas (clinician-managed)",
          "Thyroid C-cell tumor class warning — personal history matters",
          "Rapid weight loss can have its own issues (nutrition, gallstones, muscle loss) — medical follow-up helps",
        ],
      },
    ],
  },
  {
    id: "reta",
    short: "RETA",
    fullName: "Retatrutide",
    aka: "Triple agonist · GLP-1 + GIP + glucagon (investigational)",
    tagline: "Three levers — still in the research / trial spotlight",
    color: "violet",
    inPlainEnglish:
      "An experimental “triple” shot: GLP-1 + GIP like tirzepatide, plus glucagon-pathway activity. Early data look strong; it’s not a casual consumer product.",
    howItWorks:
      "Three receptor families: appetite/sugar (GLP-1, GIP) and energy burn / liver signaling (glucagon arm) — the mix is why people call it next-gen.",
    funFact:
      "If dual agonists are twincretins, retatrutide is the “three-headed dragon” of the class — still earning its clinical stripes.",
    cards: [
      {
        id: "helps",
        title: "What early science suggests",
        emoji: "🔬",
        items: [
          "Very large average weight-loss numbers in published phase 2 data",
          "Strong metabolic effects in trial populations",
          "Interest for obesity and related conditions under study",
          "Weekly dosing concept similar to other long-acting peptides",
        ],
      },
      {
        id: "sides",
        title: "Side effects seen in trials",
        emoji: "🌪️",
        items: [
          "GI symptoms dominate (nausea, diarrhea, vomiting, constipation)",
          "Dose-related: higher doses → more side effects for many participants",
          "Increased heart rate reported in some trial arms",
          "Same “start low, go slow” culture as other incretin drugs",
        ],
      },
      {
        id: "risks",
        title: "Risks & reality check",
        emoji: "🛑",
        items: [
          "Not a fully matured, everyday prescription brand like older GLP-1s in all markets",
          "Long-term safety still being mapped vs older agents",
          "Serious risks of the incretin class still apply until proven otherwise",
          "Grey-market “RETA” research vials are not the same as controlled clinical product",
          "Any human use should only ever be under legitimate medical / trial frameworks",
        ],
      },
    ],
  },
];

export function getPeptideLearn(id: string): PeptideLearn | undefined {
  return PEPTIDE_LEARN.find((p) => p.id === id || p.short.toLowerCase() === id.toLowerCase());
}
