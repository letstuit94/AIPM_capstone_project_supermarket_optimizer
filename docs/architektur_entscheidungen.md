# Architektur-Entscheidungen — Gap-Analyse & Nutri-Coach

Diskussionsprotokoll zwischen Jennifer und Claude, ausgehend vom Vergleich
des Miro-Flowdiagramms (Teamkollege) gegen die bestehende Code-Basis.

**Kontext:** 2 Wochen bis Deadline (Kursabschluss AI Projektmanagement),
2-Personen-Team, Claude Code als Werkzeug.

---

## Status Quo (aktuell)

**Fertig, verifiziert, im Betrieb:**
- Gap-Analyse-Basis: Eisen/Protein/Calcium/Fiber/Zucker/Processed, Lager,
  Health Score, Easy Swaps, Konflikt-Erkennung, Progress-Tracking, Coach-Persona
- ToDo 1 — Tages-Log mit rückwirkendem Eintragen + Freitext
- ToDo 2 — Ablaufschätzung + Lager-first Next-Cart-Empfehlung
- ToDo 3 — Kalorien als vierter absoluter Nährstoff
- **Epic 11 — Transparente Leerzustände** (`has_sufficient_data`-Flag +
  differenzierte Empty-State-Texte)
- **Epic 12 — Lager-Log Robustheit** (Autocomplete, Match-Transparenz bei
  Freitext, nachträgliches Korrigieren von Kategorie/Einheit)
- **Epic 13 — Tägliches Engagement** (In-App-Erinnerungs-Banner ab 3 Tagen
  Inaktivität, Erklärtext im Pantry-Header)
- **Epic 14 — Ergebnis-Seite vereinfacht** (Kurzansicht/Details-Toggle,
  vereinheitlichte Nährstoff-Status-Liste, eingeklappte Dimensions-Balken)
- **P1.1 — Präferenz-Lernen aus Feedback** (regelbasierte Kandidaten-
  Umsortierung anhand vergangenen Feedbacks, s. unten)

**Offen aus der Diskussion (nicht vergessen, nur noch nicht gebaut):**
- P1.1-Favoriten-Teil (siehe Realitätscheck unten — bewusst nicht mitgebaut,
  da es keine Favoriten-Funktion/-Datenmodell im Projekt gibt)
- Zwei Detail-Entscheidungen als "Claude-Empfehlung, nicht explizit
  gegengecheckt" umgesetzt — vor Präsentation kurz bestätigen lassen:
  Option A bei der Lager-first-Darstellung (zwei Karten statt Umschalter),
  ±10%-Toleranzband + Haltbarkeits-Tage-Werte bei Kalorien/Ablaufschätzung
- **Operativ, blockierend:** Gemini-Tageskontingent (20 Requests/Tag,
  kostenloser Tarif) während der Entwicklung aufgebraucht — vor dem Demo
  auf bezahlten Tarif prüfen

**Bug gefunden und behoben während Epic 12.3:** `update_pantry_item_metadata`
hat einen bereits-kanonischen Kategoriewert (z. B. "vegetable") fälschlich
durch `_canonical_category` geschickt, die deutschen Rohtext ("Gemüse") in
kanonische Kategorien übersetzt — bei englischem Input traf sie keinen
Lookup-Schlüssel und fiel still auf "other" zurück. Korrigiert: direkter
Abgleich gegen die bekannten 8 Kategorien, sonst "other".

**Deviationen von der Kollegen-Skizze (Miro), mit vorgeschlagenem Kommentar:**
Siehe Abschnitt "Abgleich mit der Kollegen-Skizze" unten — dort auch die
4 konkreten Kommentar-Texte fürs Team.

---

## Priorisierte Reihenfolge

### Erledigt

1. ✅ **Tages-Log mit rückwirkendem Eintragen + Freitext-Ergänzung**
2. ✅ **Ablaufdatum-Schätzung + Lager-first Next-Cart-Empfehlung**
3. ✅ **Kalorien als vierter absoluter Nährstoff**
4. ✅ **Epic 11 — Transparente Leerzustände**
5. ✅ **Epic 12 — Lager-Log Robustheit**
6. ✅ **Epic 13 — Tägliches Engagement**
7. ✅ **Epic 14 — Ergebnis-Seite vereinfachen**
8. ✅ **P1.1 — Präferenz-Lernen aus Feedback** (regelbasiert, kein Training;
   Favoriten-Teil bewusst nicht mitgebaut, s. Detail-Abschnitt unten)

### Offen

Keine gebauten Epics mehr offen. Verbleibend: die zwei unten genannten
Detail-Bestätigungen und der operative Gemini-Tarif-Punkt.

### Explizit für das MVP gestrichen/verschoben — mit Begründung

| Punkt | Begründung |
|---|---|
| Preis-Extraktion aus dem Kassenbon | Statische Kosten-Stufen (low/medium/high) reichen für Easy Swaps im Demo-Kontext; echte Preise sind ein Nice-to-have, kein Blocker |
| Weekly/Monthly-Übersicht | Reine Aggregations-UI über bereits vorhandene Daten — niedrigere Priorität als die funktionalen Bausteine oben |
| Grocery Ranking/Grouping | Keine geprüfte Nutzerhypothese dafür; MVP-Kernhypothese ist "vertraut der User EINER Empfehlung genug zu handeln", nicht "gefällt ihm eine Liste" |
| Volle Mikronährstoff-Abdeckung (Vitamine, Magnesium, B12, …) | OFF-Abdeckung wird pro Nährstoff schwächer, DGE-Recherche-Aufwand bleibt gleich hoch — lieber 4 Nährstoffe sauber als 10 halbgar |
| "Wie oft Zuhause kochen"-Frage im Onboarding | Kein Konsument dieser Antwort in der Pipeline — Daten sammeln ohne Verwendung |
| Freie LLM-Rezept-Generierung | Widerspricht der Kernregel seit Roadmap Story 5.3 ("LLM must not invent nutrition facts") |
| Exaktes Alter (Geburtsdatum) statt Alters-Bucket | Geprüft: Genauigkeitsgewinn marginal (Bucket-Mittelwert-Fehler bei BMR winzig ggü. der viel gröberen Aktivitäts-Stufen-Granularität); zusätzliches Pflichtfeld + mehr identifizierende Daten (Datenschutz) für kaum Nutzen |
| Getrennte Exercise-Frequency-/Daily-Movement-Felder | Redundant zu `activity_level` fürs MVP, mehr Onboarding-Reibung für kaum mehr Genauigkeit |
| Echte CI/pytest-Suite | Vorhandene manuelle Smoke-Test-Skripte sind für 2 Personen/2 Wochen in diesem Kurskontext proportional genug |
| Prospektive Frage ("Für wie viele Tage kaufst du ein?") | **Entschieden gegen** — würde das bereits funktionierende, retrospektive Lager-System konkurrierend duplizieren |
| Rohes Kaufdatum aus Kassenbon-OCR extrahieren | **Nicht nötig** — `PantryItem.last_replenished_at` (Upload-Zeitpunkt) reicht als Anker für die Ablaufschätzung |
| E-Mail/Push-Erinnerungen | Infra-Aufwand sprengt den 2-Wochen-Rahmen — Epic 13 nutzt stattdessen ein reines In-App-Banner |

---

## Abgleich mit der Kollegen-Skizze (Miro)

| Bereich | Skizze | Tatsächlich gebaut | Bewusst? |
|---|---|---|---|
| "Für wie viele Tage kaufst du ein?" (prospektiv) | Frage vor dem Next Cart | Nicht gebaut — stattdessen retrospektives Pantry/Tages-Log | Ja |
| Kaufdatum vom Kassenbon | Wird extrahiert | Nicht extrahiert — `last_replenished_at` reicht als Anker | Ja |
| Preis | Wird extrahiert | Nicht extrahiert, statische Kosten-Stufen bei Easy Swaps | Ja (MVP-Scope) |
| "Repräsentieren diese Kassenbons deinen ganzen Einkauf?" | Explizite Frage | Nicht gebaut | **Nein — echte Lücke** |
| Recipe Generation | Klingt nach dynamischer Generierung | Statische, kuratierte Tabelle | Ja (Anti-Halluzinations-Prinzip) |
| Exaktes Alter / getrennte Exercise+Movement-Felder | Beides granularer | Alters-Bucket / ein `activity_level`-Feld | Ja |
| Grocery Ranking/Grouping, Weekly/Monthly-Dashboard | Vorgesehen | Nicht gebaut | Ja |
| Goal Multiplier (Kalorienziel) | Flache Prozent-Anpassung auf TDEE | Gebaut, zusätzlich mit zweiseitigem Toleranzband + zielabhängiger Unterdrückung | Erweitert, nicht 1:1 |
| Ablaufschätzung + Lager-first-Empfehlung | Kommt in der Skizze nicht vor | Gebaut | Wir gehen über die Skizze hinaus |
| Tages-Log mit Freitext | Nur grob angedeutet (Buckets) | Präziser gebaut (echte Mengen, freies Datum) | Wir gehen über die Skizze hinaus |

**Konkrete Kommentare für den Kollegen:**

1. *Zur prospektiven Frage:* "Wir haben das bewusst nicht gebaut, weil wir ein
   retrospektives System haben (täglich bestätigter, tatsächlicher Konsum mit
   Teilmengen). Beides parallel würde sich widersprechen. Falls dein Flow
   downstream davon ausgeht — wo genau brauchst du diese Antwort?"
2. *Zu "Recipe Generation":* "Falls das freie LLM-Generierung meint: das
   widerspricht der Grundregel seit dem ersten Roadmap-Risiko ('LLM must not
   invent nutrition facts', 3. Juli). Unser System ist deshalb eine kuratierte,
   statische Tabelle. Falls du echte Generierung willst, müssen wir das vorher
   mit dieser Regel abgleichen."
3. *Zur Vollständigkeits-Frage:* "Deine Frage 'repräsentieren diese Kassenbons
   deinen ganzen Einkauf?' haben wir nicht umgesetzt — das ist eine echte
   offene Lücke bei uns, keine bewusste Streichung. Guter Punkt, den wir noch
   nachziehen sollten."
4. *Zu Kaufdatum/Preis:* "Falls dein Teil (z. B. Kosten-Dashboard) darauf
   angewiesen ist: beides wird aktuell nicht aus dem Kassenbon extrahiert.
   Sag Bescheid, falls du das brauchst."

---

## Diskussionsverlauf & Begründungen im Detail (ToDo 1–3)

### A. Prospektiv vs. retrospektiv — entschieden

Beim bestehenden, retrospektiven Lager/Konsum-System bleiben
(`services/pantry.py`, `ConsumptionEvent`). Begründung: zwei konkurrierende
Lösungen für dasselbe Grundproblem hätten sich widersprochen. Das
Pantry-System liefert echte bestätigte Daten statt einer Vorab-Schätzung.

### B. Rohes Kaufdatum aus dem Kassenbon — geprüft und verworfen

Ursprünglicher Vorschlag (Claude): Kaufdatum parsen, weil Upload-Zeitpunkt ≠
echter Kaufzeitpunkt. Gegenprüfung (Jennifer): nötig, wenn der User ohnehin
bestätigen muss, was er tatsächlich gegessen hat? Ergebnis: `intake_estimator.py`
und `progress_tracker.py` nutzen ausschließlich `ConsumptionEvent.consumed_at`
— das Kaufdatum fließt in keine Berechnung ein. Ursprüngliche Priorisierung
war ein Fehler, zurückgenommen. Das eigentliche Problem (Genauigkeit von
`consumed_at` bei seltener, nachträglicher Bestätigung) führte zu ToDo 1.

### ToDo 1 — Tages-Log (✅ erledigt)

Löst drei Unsicherheiten: **Wann gegessen** (Tages-Ansicht, rückwirkendes
Eintragen), **Vollständigkeit** (Freitext pro Tag für Lebensmittel ohne
Kassenbon-Ursprung), **Zurechenbarkeit** (kein neuer Mechanismus nötig — die
bestehende Teilmengen-Logik reicht, täglicher statt wöchentlicher Eintrag
reduziert das Vergessen-Problem).

Umgesetzt: `confirm_consumption()`/`insert_consumption_event()` mit optionalem
`consumed_at`; `log_manual_consumption()` (matched gegen Lager-Item falls
vorhanden, sonst unabhängiger Log-Eintrag); `POST`/`GET /pantry/log`;
`PantryStep.tsx` mit Vor-/Zurück-Datumsnavigation (14 Tage) + Freitext-Formular.
Scope-Cut: nur Hinzufügen, kein Bearbeiten/Löschen vergangener Tage.

### ToDo 2 — Ablaufschätzung + Lager-first-Empfehlung (✅ erledigt)

Umgesetzt: `services/shelf_life.py` (Haltbarkeits-Tabelle pro Kategorie,
bewusst approximiert); `PantryItem.estimated_expiry`/`days_until_expiry`
(on-the-fly berechnet); `find_pantry_match()` in `recommender.py` (bevorzugt
das am schnellsten ablaufende passende Lager-Item, respektiert
Exclusion-Filter, abgelaufene Items bleiben sichtbar mit `urgent=True`);
`PantryMatchCard` zusätzlich zur `NextCartCard` (Option A).

**Bug gefunden und behoben:** Kategorien wurden beim Einlagern nie
kanonisiert (blieben roher Parser-Text wie "Getränke" statt "drink") —
dadurch wären sowohl die Ablaufschätzung als auch die länger bestehende
Gramm-Umrechnung in `intake_estimator.py` fast immer auf den "other"-Fallback
zurückgefallen. Behoben über `fallback_categories._canonical_category` beim
Einlagern.

### ToDo 3 — Kalorien als vierter absoluter Nährstoff (✅ erledigt)

Bricht bewusst das bisherige Muster (Eisen/Protein/Calcium = "mehr ist immer
besser bis zum Bedarf"): Kalorien brauchen ein zielabhängiges Ziel und einen
zweiseitigen Gap. Umgesetzt: `personalized_tdee()` aus der Protein-Rechnung
extrahiert; `_CALORIE_GOAL_ADJUSTMENT`-Tabelle (Miro-Diagramms "Goal
Multiplier"); `detect_calorie_gap()` mit ±10%-Toleranzband, **außerhalb**
der generischen `_NUTRIENTS`-Schleife.

**Korrektur während der Verifikation:** die erste Fassung hat bei
zielkonformer Abweichung (Defizit bei "Abnehmen", Überschuss bei
"Muskelaufbau") nur eine mildere Nachricht gezeigt, nicht — wie in der
eigenen Spec verlangt — den Gap komplett unterdrückt. Beim Gegentesten
gegen die eigene Verifikationsvorgabe gefunden und korrigiert.

### P1.1 — Präferenz-Lernen aus Feedback (✅ erledigt)

**Bewertung:** grundsätzlich gut, aber ausdrücklich kein trainiertes Modell
— mit 2 Testern über 2 Wochen nicht seriös machbar, würde der
Anti-Halluzinations-Linie widersprechen. Stattdessen regelbasierte
Gewichtung auf Bestehendem: Feedback-System (`models/feedback.py`) existierte
bereits, wurde aber nie ausgelesen.

**Umgesetzt:**
- `db/supabase.py`: neu `get_feedback_by_session(session_id)` (analog zu
  `get_recommendations_by_session`).
- `services/preference_learning.py` (neu): `item_preference_scores(session_id)`
  verknüpft `recommendations.payload.item` (welches Item wurde gezeigt) mit
  `feedback.response` (yes=+1/no=-1/maybe=0) über `recommendation_id` und
  summiert pro Item-Name.
- `services/recommender.py`: neu `_apply_preference_scores(candidates, scores)`
  — stabile Umsortierung nach Score (höchster zuerst, Tabellenreihenfolge als
  Tiebreaker), **entfernt nie einen Kandidaten**, verschiebt ihn nur.
  `recommend_next_cart()` und `find_pantry_match()` erhalten optionalen
  `session_id`-Parameter, wenden den Boost vor dem Exclusion-Filter an;
  ein positiv bewerteter Treffer bekommt einen zusätzlichen
  Reasoning-Satz ("You've responded positively to this before."). Ohne
  `session_id`/ohne Feedback-Historie bleibt das Verhalten unverändert
  (bestehende Regressionsskripte laufen unverändert grün).
- `api/recommendations.py`: `session_id` wird an beide Aufrufe durchgereicht.

**Bewusst nicht mitgebaut — Favoriten:** Es gibt kein Favoriten-
Datenmodell/keine Favoriten-UI im Projekt; das wäre eine neue Funktion,
nicht nur eine Verdrahtung von Bestehendem, und war nicht Teil eines
bestätigten Atomic-Task-Scopes. Aufgeführt als offener Erweiterungspunkt,
falls Zeit bleibt — kein Blocker für die Kernfunktion.

**Verifiziert (live gegen echte Supabase-Tabellen `recommendations`/`feedback`,
Testdaten danach gelöscht):** Baseline ohne Feedback wählt den ersten
erlaubten Kandidaten in Tabellenreihenfolge ("Griechischer Joghurt" für
`protein:low`). Nach einem simulierten "yes"-Feedback auf "Tofu" wählt
dieselbe Session "Tofu", inklusive Transparenz-Hinweis in `reasoning`. Nach
einem simulierten "no"-Feedback auf den ursprünglichen Top-Kandidaten wird
dieser ans Ende verschoben, bleibt aber unverändert in der zugrunde
liegenden Kandidatenliste (`_apply_preference_scores` verändert nur die
Reihenfolge, nie die Menge — separat per Unit-Check bestätigt).

**Realitätscheck:** mit wenig Nutzungshistorie wird der Effekt eher
anekdotisch als groß sichtbar sein — im Pitch nicht als "lernender
Algorithmus" überverkaufen.

---

## Epics 11–14 (entwicklungsbereit)

Format wie im übrigen Projekt (`deprecated/roadmap_consolidated.md`): Epic → User
Story → Atomic Tasks (Component/Input/Output/Success/Test). Jede Story ist
so beschrieben, dass ein Entwickler sie ohne Rückfrage umsetzen kann.

### Epic 11 — Transparente Leerzustände

**Ziel:** Der Nutzer soll nie im Unklaren sein, ob ein leerer Gap-Bereich
"alles im grünen Bereich" oder "noch nicht genug Daten" bedeutet.

**11.1 — Data-Sufficiency-Signal.** Als Nutzer will ich unterscheiden
können, ob "keine Gaps" heißt "alles gut" oder "noch nichts bestätigt",
damit ich nicht fälschlich denke, meine Ernährung sei bereits optimal.

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 11.1.1 Data-Sufficiency-Flag | `backend/app/services/absolute_gap_detector.py` (neue Funktion `has_sufficient_data(session_id) -> bool`, genutzt in `api/nutrition.py`) | `estimate_daily_*` Ergebnisse der 4 Nährstoffe (`events_considered`) | neues Response-Feld `has_sufficient_data: bool` (True, wenn mind. 1 Nährstoff `events_considered > 0` hat) | Snapshot-Response unterscheidet "keine Events" von "im Zielbereich" | Session ohne jeden Confirm → `false`; Session mit ≥1 Confirm + Werten im Zielbereich → `true`, `absolute_gaps=[]` |
| 11.1.2 Empty-State-Text differenzieren | `frontend/src/steps/ResultsStep.tsx`, `frontend/src/types/api.ts` (`has_sufficient_data` auf `NutritionSnapshot`), `frontend/src/lib/i18n.tsx` (zwei neue Keys) | `snapshot.has_sufficient_data` | zwei unterschiedliche Texte im leeren `absolute_gaps`-Bereich | Text ändert sich sichtbar je nach Flag | Manuell beide Zustände auslösen (Session ohne Confirms vs. mit) |

### Epic 12 — Lager-Log Robustheit

**Ziel:** Freitext-Eingaben im Tages-Log sollen nicht durch Tippfehler
unbeabsichtigt vom Lagerbestand entkoppelt werden, und der Nutzer soll
Transparenz über die Datenqualität seiner Einträge haben.

**12.1 — Autocomplete aus dem Lagerbestand.** Als Nutzer will ich beim
Freitext-Eintrag Vorschläge aus meinem bestehenden Lager sehen, damit
Tippfehler nicht zu ungewollt getrennten Einträgen führen.

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 12.1.1 Autocomplete-Liste | `frontend/src/steps/PantryStep.tsx` (`ManualLogForm`) | bereits geladene `items`-Liste (kein neuer Endpoint) | HTML `<datalist>` (oder gefilterte Dropdown-Liste) mit den Lager-Namen | Tippen zeigt passende Lager-Items zur Auswahl | Manuell: Teilstring eines Lager-Namens eintippen, Vorschlag erscheint |

**12.2 — Match-Transparenz bei Freitext.** Als Nutzer will ich sehen, ob
mein Freitext-Eintrag echten Nährwerten zugeordnet werden konnte, damit ich
weiß, wie verlässlich die Schätzung ist.

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 12.2.1 Match-Info in Response | `backend/app/api/pantry.py` (`POST /pantry/log`), reuse `services/nutrition_mapping.map_items` | Freitext-Name | Response-Feld `matched: bool` (True bei OFF/generischem Match, False bei reinem Fallback) | Response zeigt Match-Qualität, ohne den Log-Eintrag selbst zu verändern | Bekannter Name (z. B. "Apfel") → `matched=true`; Fantasiename → `matched=false` |
| 12.2.2 UI-Hinweis | `frontend/src/steps/PantryStep.tsx` | `matched` aus 12.2.1 | kurzer Hinweistext nach dem Hinzufügen ("passende Nährwerte gefunden" / "grobe Schätzung") | Hinweis erscheint korrekt je nach Match-Ergebnis | Beide Fälle manuell auslösen |

**12.3 — Lager-Item nachträglich korrigieren.** Als Nutzer will ich
Kategorie/Einheit eines Lager-Items nachträglich korrigieren können, damit
falsch erkannte OCR-Daten die Ablaufschätzung nicht verfälschen.

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 12.3.1 PATCH-Endpoint | `backend/app/api/pantry.py` (neu: `PATCH /pantry/items/{normalized_name}`), `backend/app/services/pantry.py` (neu: `update_pantry_item_metadata(session_id, name, unit=None, category=None)`) | Body `{unit?, category?}` | aktualisiertes Lager-Item | Kategorie-Änderung wirkt sich sofort auf `days_until_expiry` aus | Kategorie von "other" auf "vegetable" ändern → Ablaufschätzung ändert sich entsprechend |
| 12.3.2 Edit-UI | `frontend/src/steps/PantryStep.tsx` (`PantryRow`) | aktuelle `unit`/`category` | inline editierbare Felder | Änderung wird gespeichert und sofort angezeigt | Manuell Kategorie ändern, Seite neu laden, Änderung bleibt |

### Epic 13 — Tägliches Engagement

**Ziel:** Nutzer zur regelmäßigen Bestätigung motivieren, ohne
E-Mail/Push-Infrastruktur aufzubauen (Scope-Cut, siehe Streichliste oben).

**13.1 — In-App-Erinnerung.** Als Nutzer will ich eine Erinnerung sehen,
wenn ich länger nicht geloggt habe, damit meine Bedarfsschätzungen nicht
veralten.

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 13.1.1 Tage-seit-letzter-Bestätigung | `backend/app/services/pantry.py` (neu: `days_since_last_confirmation(session_id) -> Optional[int]`), eingehängt in `api/pantry.py`'s `GET /pantry`-Response | letztes `ConsumptionEvent.consumed_at` der Session | Response-Feld `days_since_last_confirmation` | Korrekter Tageswert, `None` wenn nie bestätigt | Session mit Confirm vor 5 Tagen → `5`; frische Session → `None` |
| 13.1.2 Banner-UI | `frontend/src/steps/PantryStep.tsx` (oder `ResultsStep.tsx`) | `days_since_last_confirmation >= 3` | Hinweis-Banner ("Du hast seit X Tagen nichts bestätigt — deine Schätzungen werden ungenauer") | Banner erscheint/verschwindet korrekt je nach Wert | Manuell Schwellenwert testen |

**13.2 — Begründung im UI.** Als Nutzer will ich verstehen, warum
tägliches Bestätigen wichtig ist, damit ich es priorisiere.

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 13.2.1 Erklärtext | `frontend/src/steps/PantryStep.tsx`, `frontend/src/lib/i18n.tsx` (neuer Key) | — (reiner Copy/Platzierungs-Task) | kurzer Erklärtext im Pantry-Header | Text ist sichtbar, ohne die Seite zu überladen | Visuelle Prüfung |

### Epic 14 — Ergebnis-Seite vereinfachen

**Ziel:** Die Ergebnis-Seite (aktuell 12+ Karten/Blöcke untereinander) auf
eine schnelle "Kurzansicht" + optionale "Details" verteilen — Demo-Politur,
keine neue Funktionalität. Bewusst zuletzt, da subjektivster Punkt.

**14.1 — Kurzansicht vs. Details.** Als Nutzer will ich zuerst eine kurze,
verständliche Zusammenfassung sehen, bevor ich mich durch technische
Details klicke.

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 14.1.1 Layout-Umbau | `frontend/src/steps/ResultsStep.tsx` | bestehende Karten (unverändert in sich) | "Kurzansicht" (Coach-Message, Health Score, Next-Cart/Pantry-Match-Karte(n), Conflicts falls vorhanden) oben, Rest (Progress, Dimensions, Gaps, Absolute Gaps, Easy Swaps, Pantry-Recipes, evaluated_candidates) unter einem Toggle/`<details>` | Seite wirkt beim ersten Laden deutlich kürzer, alle Inhalte bleiben erreichbar | Manuell: Seite laden, Kurzansicht sichtbar, Details einklappbar |

**14.2 — Vereinheitlichte Nährstoff-Anzeige.** Als Nutzer will ich
Nährstoff-Status an einem Ort sehen, nicht in zwei getrennten Listen
(Dichte-Gaps / absolute Gaps).

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 14.2.1 Anzeige zusammenführen | `frontend/src/steps/ResultsStep.tsx` | `snapshot.gaps` + `snapshot.absolute_gaps` (Backend-Trennung bleibt unangetastet) | eine gemeinsame Anzeige-Liste "Nährstoff-Status", pro Eintrag mit Einheit (damit Dichte- und Absolut-Werte nicht verwechselt werden) | Nutzer sieht einen Bereich statt zwei | Beide Gap-Typen gleichzeitig vorhanden → beide erscheinen in derselben Liste, klar unterscheidbar |

**14.3 — Dimensionen einklappen.** Als Nutzer will ich die rohe
Dimensions-Balkenanzeige nur bei Bedarf sehen.

| Task | Component | Input | Output | Success | Test |
|---|---|---|---|---|---|
| 14.3.1 Standardmäßig eingeklappt | `frontend/src/steps/ResultsStep.tsx` | bestehende `DimensionBar`-Sektion | Sektion standardmäßig eingeklappt, mit "Details anzeigen"-Toggle | Sektion ist beim Laden nicht sichtbar, aber ein Klick entfernt | Manuell togglen |
