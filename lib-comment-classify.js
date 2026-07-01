// The Hard Win — comment classifier + safe reply drafter (draft-only).
//
// This is deliberately a plain, deterministic ruleset — NOT a live LLM call — so it can
// run offline and never invents facts. It follows COMMENT_REPLY_WORKFLOW.md:
//   - never invent historical facts   -> drafts are generic + point back to the receipt
//   - never argue                      -> hostile/troll comments get NO draft
//   - never correct without review     -> corrections go to needs_research, held draft
//   - never respond to spam            -> spam gets do_not_engage, no draft
//   - escalate sensitive/disputed      -> no public draft; flagged for Tanya
//
// To upgrade to a real AI drafter later, replace draftReply() with an LLM call but KEEP the
// same guardrails: high-risk categories must still return draft=null and escalate to Tanya.

// ---- small matchers -------------------------------------------------------
const has = (t, words) => words.some((w) => t.includes(w));
const RE_URL = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|io|co|shop|link|xyz|ru)\b)/i;

const SPAM = ["dm me", "check my", "check out my", "follow back", "follow me", "promo",
  "giveaway", "free followers", "click the link", "link in bio to", "crypto", "forex",
  "invest", "earn $", "make money", "cash app", "onlyfans", "🔗"];
const HOSTILE = ["idiot", "stupid", "moron", "dumb", "trash", "garbage", "shut up",
  "loser", "pathetic", "cringe", "you suck", "hate you", "kill yourself", "worthless"];
const CORRECTION = ["wrong", "incorrect", "false", "not true", "isn't true", "that's a lie",
  "lie", "didn't happen", "did not happen", "fact check", "fact-check", "actually it was",
  "actually it's", "misinformation", "you got it wrong", "that's inaccurate"];
const DISPUTE = ["propaganda", "myth", "never happened", "colonizer", "genocide", "racist",
  "political", "politics", "disputed", "controversial", "whitewash", "erased", "stolen land",
  "both sides", "communist", "fascist", "religion is", "god is"];
const SOURCE = ["source?", "source", "sources", "citation", "cite", "reference",
  "where did you", "where's this from", "where is this from", "proof?", "any proof",
  "says who", "receipts?"];
const PERSONAL = ["i needed", "i really needed", "this helped me", "helped me", "me too",
  "i'm going through", "im going through", "i am going through", "i struggle", "i've been",
  "ive been", "my story", "for me this", "i felt", "i feel this", "reminds me of when i"];
const PRAISE = ["love", "great", "amazing", "inspiring", "inspired", "so true", "needed this",
  "well said", "beautiful", "powerful", "thank you", "thanks", "appreciate", "🔥", "💪",
  "👏", "🙏", "❤️", "goosebumps", "facts"];

const QUESTION_STARTS = ["who ", "what ", "when ", "where ", "why ", "how ", "did ", "is ",
  "are ", "was ", "were ", "does ", "do ", "can ", "could ", "would ", "which "];

// ---- safe draft templates (grounded, brief, in-voice, no invented facts) --
const DRAFTS = {
  praise_support: "Really glad this one landed. Keep showing up — that's the whole thing.",
  personal_story:
    "Thank you for sharing that — it takes something to say it out loud. Keep going; the quiet reps are the ones that count.",
  question:
    "Good question. We only put a detail on a card when two independent, reputable sources back it — happy to point you to the receipt on this one.",
  source_request:
    "It's on the card's receipt line — we ship a detail only when two independent, reputable sources agree. Glad to share them.",
  // Held draft: never auto-sends. Goes to needs_research for a human source check first.
  correction_challenge:
    "Thanks for flagging it — we're double-checking the sources now and will correct it if it's off. We'd rather be right than fast.",
};

// ---- classify -------------------------------------------------------------
// Returns { comment_type, risk_level, status, source_check_required, ai_reply_draft, notes }
function classify(rawText) {
  const t = String(rawText || "").toLowerCase().trim();

  // Order matters: the safest / most restrictive checks come first.
  if (RE_URL.test(t) || has(t, SPAM)) {
    return pack("spam_promo", "low", "do_not_engage", false, null,
      "Auto: looks like spam/promo — no reply.");
  }
  if (has(t, HOSTILE)) {
    return pack("hostile_trolling", "high", "do_not_engage", false, null,
      "Auto: hostile/troll — do not engage, do not argue.");
  }
  if (has(t, CORRECTION)) {
    return pack("correction_challenge", "high", "needs_research", true,
      DRAFTS.correction_challenge,
      "Auto: claims a factual error. HELD — re-check our two sources before any reply. Escalate to Tanya.");
  }
  if (has(t, DISPUTE)) {
    return pack("sensitive_historical_dispute", "high", "needs_review", true, null,
      "Auto: sensitive/disputed topic. Escalate to Tanya — AI does not draft a public reply here.");
  }
  if (has(t, SOURCE)) {
    return pack("source_request", "medium", "needs_review", true, DRAFTS.source_request,
      "Auto: source request. Confirm the two verified sources before sending.");
  }
  if (isQuestion(t)) {
    return pack("question", "medium", "needs_review", true, DRAFTS.question,
      "Auto: question. Only answer from an already-verified receipt; otherwise set needs_research.");
  }
  if (has(t, PERSONAL)) {
    return pack("personal_story", "medium", "needs_review", false, DRAFTS.personal_story,
      "Auto: personal story — warm acknowledgment, no advice-dump.");
  }
  // Default: treat as praise/support (lowest risk). Still needs Tanya's approval.
  return pack("praise_support", "low", "needs_review", false, DRAFTS.praise_support,
    has(t, PRAISE) ? "Auto: praise/support." : "Auto: uncategorized — treated as praise/support, low risk.");
}

function isQuestion(t) {
  if (t.includes("?")) return true;
  return QUESTION_STARTS.some((s) => t.startsWith(s));
}

function pack(comment_type, risk_level, status, source_check_required, ai_reply_draft, notes) {
  return { comment_type, risk_level, status, source_check_required, ai_reply_draft, notes };
}

module.exports = { classify };
