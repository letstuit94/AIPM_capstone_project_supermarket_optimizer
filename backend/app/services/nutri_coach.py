"""
Nutri-Coach: a warm, conversational voice wrapped around the already-
computed gap/recommendation/progress data — NOT a new source of
nutrition facts.

The LLM's only job is phrasing. Every number and food name in the coach
message must come from the structured `context` dict passed in; the
system prompt explicitly forbids inventing anything beyond it. If the
call fails for any reason (rate limit, network, missing key, empty
response), a rule-based template takes over instead — same "a
should-have feature must not break the core flow" stance as
recipe_suggester.py and recommender.py's recommendations.json loader.
"""

import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Loaded here too (not just receipt_parser.py) so this module doesn't
# implicitly depend on receipt_parser having been imported first to
# populate GEMINI_API_KEY into os.environ — load_dotenv() is idempotent.
load_dotenv()

# One client for the module's lifetime (matches receipt_parser.py's
# pattern) — bug fix: instantiating a fresh genai.Client() per call
# raised "Cannot send a request, as the client has been closed" on the
# very first request, since the SDK's client isn't meant to be
# throwaway-constructed per call.
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are NutriWise's Nutri-Coach: a warm, encouraging, concise nutrition coach.

You will be given a JSON object with facts ALREADY COMPUTED by a rule-based
nutrition engine: a health score, flagged gaps, one shopping recommendation,
a few easy swap ideas, and (if available) week-over-week progress.

STRICT RULES:
- Use ONLY the facts given in the JSON. Do not invent, estimate, or add any
  nutrient values, foods, health claims, or numbers not present in the input.
- Never give medical advice or diagnose anything.
- If a field is missing, null, or an empty list, simply don't mention it —
  never guess or fill in a plausible-sounding placeholder.
- Keep it to 3-5 short sentences: acknowledge the status quo, name what to
  cut back on and what to add (only from the given data), end with one
  encouraging, actionable note.
- Write in the language given by "language" ("de" = German, "en" = English).
- Plain conversational prose — no headers, no bullet points, no markdown.
"""


def _fallback_message(context: dict) -> str:
    """
    Rule-based template used whenever the Gemini call fails — built from
    the exact same `context` facts, so the coach voice is never just
    missing, and never says anything the LLM path couldn't also say.
    """

    parts = []

    health_score = context.get("health_score")
    if health_score:
        label = str(health_score.get("label", "")).replace("_", " ")
        parts.append(f"Your health score is {health_score.get('value')}/100 ({label}).")

    top_gaps = context.get("top_gaps") or []
    if top_gaps:
        names = ", ".join(g["dimension"] for g in top_gaps)
        parts.append(f"Right now your basket could use some attention on: {names}.")

    recommendation = context.get("recommendation") or {}
    if recommendation.get("item"):
        parts.append(f"Try to {recommendation.get('action_type', 'add')} {recommendation['item']} next time.")

    easy_swaps = context.get("easy_swaps") or []
    if easy_swaps:
        parts.append(f"An easy place to start: {easy_swaps[0]['item']}.")

    progress_trend = context.get("progress_trend")
    if progress_trend and progress_trend != "insufficient_data":
        parts.append(f"Compared to last time, things look {progress_trend}.")

    if not parts:
        return "Keep going — upload another receipt to start seeing how your basket is trending."

    return " ".join(parts)


def generate_coach_message(context: dict, language: str = "en") -> str:
    """
    `context` should be a small, plain-JSON-serializable dict of already-
    computed facts (see api/recommendations.py for what's passed) —
    never raw profile data or anything not meant to be phrased back to
    the user.
    """

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[json.dumps({**context, "language": language}, ensure_ascii=False)],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.4,
            ),
        )
        text = (response.text or "").strip()
        if not text:
            return _fallback_message(context)
        return text
    except Exception as e:
        print(f"[nutri_coach] Gemini call failed, falling back to template: {e}")
        return _fallback_message(context)
