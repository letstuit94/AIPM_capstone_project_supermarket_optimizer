# NutriWise Demo Script

Task 9.4. A step-by-step run of the core loop for a live demo or a
recorded walkthrough. Target: upload → result in under 2 minutes (the
MVP's own qualitative success bar).

## 0. Before you start

- Backend running (`uvicorn backend.app.main:app --reload`) and reachable.
- Frontend running (`npm run dev` in `frontend/`) and pointed at that backend.
- Have `backend/app/fixtures/receipts/clean_receipt.txt` open in another
  window as your paste-fallback safety net — see "If something breaks" below.
- Say the positioning line before touching the app:

  > "Upload a grocery receipt. Get one smarter thing to buy next time."

  Not a calorie tracker, not a medical coach, not a meal planner.

## 1. Consent (≈10 seconds)

Open the app. Point out the consent screen before doing anything else:
this is deliberate — GDPR consent is captured before any data is
processed, not buried in a settings page.

Click "I understand, continue."

## 2. Upload (≈20 seconds)

Say: "OCR on real receipts is unreliable, so pasting text is a first-class
path, not a fallback bolted on afterward."

- Either drop a real receipt photo, or switch to "Paste text" and paste
  the fixture receipt.
- Point out the loading state, then the parsed item list that appears —
  note the "uncertain" tag on any ambiguous item, and that nothing is
  hidden even if it's unclear.

## 3. Review (≈15 seconds)

Click "Review items →". Say: "Before anything is analyzed, you get to
correct what was detected." Optionally edit one item's name or quantity
live to show the correction actually persists.

## 4. Profile (≈20 seconds)

Click "Continue to profile." Fill in the four questions (goal, age
range, activity level, dietary pattern) — time this out loud if you
want to underline the "<90 seconds" claim. Add an exclusion (e.g.
"peanuts") to set up the Next Cart payoff in step 6.

(Or click "Skip for now" to show the app still works with a neutral
profile — useful if you want to demo the unpersonalized path too.)

## 5. Results: the nutrition snapshot (≈20 seconds)

Point out, in this order (this order is deliberate — Story 7.2):

1. The disclaimer banner ("estimated from your grocery purchases, not
   actual intake") — say explicitly that this is not medical advice and
   receipts can't see meals eaten out or shared food.
2. The Next Cart card, right below it — that's the primary outcome,
   shown before the detailed breakdown.
3. Only then: the 5 nutrition dimensions (fiber, protein, sugar,
   calories, processed) as progress bars, and the top gaps.

## 6. Next Cart (≈20 seconds)

Read the recommended item and its reasoning aloud. If you set a dietary
exclusion in step 4, expand "N candidates considered" and show that a
conflicting candidate was skipped with a stated reason — this is the
core trust mechanic: recommendations are grounded in structured data
and profile constraints, nothing is invented.

If recipes appear below the recommendation, point them out too: up to 3
recipes matched to the exact recommended item, from a curated table —
not a live API call or an LLM guess, same "no invented facts" guarantee
as the recommendation itself.

## 7. Feedback (≈10 seconds)

Click "yes" / "maybe" / "no" on "Would you consider buying this next
time?" — this is the signal the MVP's core hypothesis lives or dies on:
does a user trust an AI recommendation inferred from receipt data enough
to act on it.

## 8. Trust: consent isn't just a checkbox (≈10 seconds, optional)

Scroll to the footer and point out "Delete my data" — click it. Say:
"Consent isn't a one-way door — you can permanently erase your receipt
and profile at any time, and it actually deletes server-side, not just
locally." Good to show right after feedback, since it closes the loop
on the consent promise made in step 1.

## 9. Wrap-up talking points

- **Hypothesis being tested**: passive behavioral reconstruction from
  receipt data, plus a single clear decision, can shift grocery behavior
  without asking anyone to log food.
- **What this is not**: a full nutrition tracker, a household planner, a
  performance optimizer, or medical advice. Don't imply any of these are
  coming "in the next version" — they're explicitly out of scope.
- **Known limitations to state out loud, not hide**: match quality
  depends on OpenFoodFacts coverage (fallback-category items are
  visibly marked lower-confidence); the nutrition snapshot is an
  estimate from purchases, not verified intake; recommendation quality
  depends on how many receipts have been uploaded so far.

## If something breaks

- **Live OCR fails or is slow**: switch to "Paste text" and use
  `backend/app/fixtures/receipts/clean_receipt.txt` — the app itself
  nudges toward this automatically on an image-upload error (Story 9.3).
- **Upload fails with "Maximum retries exceeded"**: the Gemini API quota
  is exhausted (a real, observed failure mode after repeated testing in
  a short window, not hypothetical) — this affects BOTH the image and
  paste-text paths equally, since both call Gemini. There is no
  in-app fallback for this specific failure; switch immediately to a
  rehearsed backup (a previously-uploaded session, or a screen
  recording) rather than retrying live in front of an audience.
- **"No receipt items found" on Results**: you skipped upload, or
  deleted your data — go back to step 2.
- **Next Cart says "basket looks balanced" / no gaps**: expected on a
  single well-rounded receipt. Upload a second, less balanced receipt
  (or the `messy_receipt.txt` fixture) to force a visible gap.
- Never apologize for the "estimated, not exact" framing — it's a
  deliberate trust feature, not a limitation to explain away.
