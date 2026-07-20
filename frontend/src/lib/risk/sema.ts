/**
 * SEMA (semaglutide) risk-education content for /risk.
 * Educational / research context only — not medical advice.
 */

export type RiskSection = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  severity?: "info" | "warn" | "critical";
};

export const SEMA_RISK = {
  slug: "sema",
  name: "Semaglutide",
  symbol: "SEMA",
  market: "SEMA-PERP",
  tagline: "GLP-1 receptor agonist · research risk brief",
  disclaimer:
    "For research and educational purposes only. Not medical advice. Not for human consumption. SEMA on PEPT Trade is a research-market instrument; physical product (if any) is research-use only via partner channels. Always follow your jurisdiction’s laws and institutional protocols.",
  sections: [
    {
      id: "overview",
      title: "What researchers study",
      summary:
        "Semaglutide is a long-acting GLP-1 receptor agonist studied for metabolic and related pathways. Branded human medicines (e.g. Ozempic®, Wegovy®) are prescription products regulated as drugs — not the same as research materials or grey-market vials.",
      severity: "info" as const,
      bullets: [
        "PEPT SEMA marks track research-market $/mg from multi-vendor aggregation — not pharmacy list prices.",
        "Approved drug products are manufactured under GMP, prescribed under medical supervision, and supplied through licensed pharmacies.",
        "Research peptides sold as “not for human use” are a different regulatory and quality category.",
      ],
    },
    {
      id: "dosage",
      title: "Dosage context (education only)",
      summary:
        "Clinical dosing for approved products is protocol-driven (typically microgram–milligram weekly schedules under a clinician). Research labs use institutional SOPs for in vitro / animal protocols. This is not a dosing guide for self-administration.",
      severity: "warn" as const,
      bullets: [
        "Approved injectable products use fixed-dose pens with titration schedules set by prescribing information — not ad-hoc vial reconstitution.",
        "Concentration errors (mg/mL miscalculation) are a common failure mode when non-clinical material is mishandled.",
        "“Research Only” kit sizes (e.g. multi-vial kits) are inventory units for labs — not a recommended course of therapy.",
        "Never scale research-market $/mg or vial labels into a personal dosing plan without a licensed professional and approved product.",
      ],
    },
    {
      id: "side-effects",
      title: "Known risk / adverse-effect landscape",
      summary:
        "Published clinical experience with approved semaglutide products documents GI and other adverse events. Risk profile differs by dose, patient population, and product quality. Non-pharma material adds contamination and identity risk on top of pharmacology.",
      severity: "warn" as const,
      bullets: [
        "Common (approved products): nausea, vomiting, diarrhea, constipation, abdominal pain, reduced appetite.",
        "Serious (boxed / labeled risks vary by product): pancreatitis risk signals, gallbladder disease, hypoglycemia when combined with other agents, potential thyroid C-cell tumor risk in rodents (human relevance debated; labeled for some products).",
        "Injection-site reactions, dehydration from GI loss, and rare hypersensitivity can occur.",
        "Counterfeit or mislabeled material can cause infection, endotoxin reaction, or completely different pharmacology if the active is wrong.",
        "If someone experiences emergency symptoms (severe abdominal pain, allergic reaction, persistent vomiting), that is a medical emergency — seek licensed care, not a trading platform.",
      ],
    },
    {
      id: "legal",
      title: "Legal status (high level)",
      summary:
        "Legal status is jurisdiction-specific. Approved medicines are prescription-only in most markets. Importing, compounding, or reselling without licenses can violate drug, customs, and consumer-protection laws.",
      severity: "critical" as const,
      bullets: [
        "United States: FDA-approved semaglutide products are prescription drugs. Unapproved new drugs and misbranded products can trigger enforcement.",
        "“Research chemical / not for human consumption” labeling does not legalize personal therapeutic use or illegal import.",
        "Tokenized SEMA on PEPT is a crypto instrument; holding a token is not a prescription and does not authorize medical use.",
        "Redemption / kit flows (if available) are research-channel logistics with verification — not a pharmacy dispense.",
        "You are responsible for compliance in your country, state, and institution.",
      ],
    },
    {
      id: "storage",
      title: "Storage & handling (research labs)",
      summary:
        "Peptide integrity depends on cold chain, light, moisture, and reconstitution practice. Poor storage degrades activity and can create unsafe particulates or contamination.",
      severity: "info" as const,
      bullets: [
        "Follow the certificate of analysis / SDS from the supplier when available; many lyophilized peptides prefer cold, dry, dark storage.",
        "Approved pen products have labeled fridge/room-temp windows — do not assume research vials match those labels.",
        "Reconstituted solutions are generally less stable; sterile technique and discard timelines matter for lab SOPs.",
        "Avoid freeze–thaw cycling and untracked “kitchen fridge” storage for materials intended for controlled research.",
        "Document lot numbers, open dates, and storage conditions in lab records.",
      ],
    },
    {
      id: "black-market",
      title: "Black-market & grey-market dangers",
      summary:
        "Unregulated online “sema” is one of the highest-risk categories in peptide commerce: counterfeits, under/over-potency, bacterial contamination, and bait-and-switch molecules.",
      severity: "critical" as const,
      bullets: [
        "Identity risk: HPLC/MS of seized samples has shown wrong actives, fillers, or no peptide at all.",
        "Potency risk: labeled mg may not match contents — overdose or underdose relative to expectations.",
        "Sterility risk: non-sterile fill, endotoxin, and fungal contamination can cause serious infection.",
        "Supply-chain risk: Telegram/Discord “sources,” repackaged pharmacy pens, and stolen goods.",
        "Legal risk: customs seizures, platform bans, and personal liability for unapproved drug distribution.",
        "PEPT’s dual-source oracle (vendor basket + aggregator) is for market transparency of research pricing — not a quality guarantee of any physical vial you might buy elsewhere.",
        "If your goal is approved medical treatment, use a licensed clinician and pharmacy — not grey-market vials or token markets.",
      ],
    },
  ] satisfies RiskSection[],
  quickChecks: [
    { label: "Approved Rx path?", detail: "Licensed clinician + pharmacy product" },
    { label: "Research path?", detail: "Institutional SOP, CoA, lawful supply" },
    { label: "Grey market?", detail: "High counterfeit / legal / infection risk" },
    { label: "PEPT SEMA token?", detail: "Market instrument · not a prescription" },
  ],
  related: [
    { href: "/spot", label: "SEMA spot" },
    { href: "/oracle/monitor", label: "Oracle monitor" },
    { href: "/redeem", label: "Kit redemption" },
  ],
};
