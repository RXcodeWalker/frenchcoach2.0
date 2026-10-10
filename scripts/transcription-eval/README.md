# Transcription eval (Step 0 of the Learn Wispr-style transcript plan)

Offline benchmark that decides **whether to adopt Whisper over Chrome text, and turbo vs large-v3**, for
Learn's transcripts. Standalone: it is not part of the app, the scorer or `scripts/stt/` (Assessment-Engine
territory). Recordings are your voice and stay out of git (`data/transcription-eval/` is gitignored).

## Protocol

1. **Declare the decision rule first.** Fill in the `null` thresholds in `decision-rule.json`
   (`minWerImprovementOverChrome`, `minAccentMarginForLargeV3`, `maxP95LatencyMs`; `maxHallucinations` is 0).
   `run` refuses to start with nulls, and `score` refuses a rule edited after the run (hash check).
   Rule: adopt Whisper only if WER beats Chrome by the margin with zero hallucinated outputs; prefer large-v3
   over turbo only if it beats turbo on the accent clips by the margin **and** its p95 fits the budget.
   (The refine budget is ~8 s in total, which also covers the blob wait and the ~3 s repair pass.)
2. **Capture** ~15 clips: open `capture.html` in Chrome (`npx vite` is not needed; open the file directly or
   serve the folder). It records audio and Chrome's final text at the same time, using Learn's recognizer settings.
   Include:
   - 3 adversarial clips: `silence` (near-silence: hallucination test), `offtopic` (answer unrelated to the vocab
     hint: does the prompt force-fit expected words?), `grammar-error` (a deliberate mistake that must survive
     prompt + cleanup);
   - 5 clips with **both** references (verbatim + intended-clean) to score filler retention and the repair pass;
   - a few `accent` clips for the large-v3 margin rule.
   Export into `data/transcription-eval/` (`manifest.json` + audio).
3. **Run** `GROQ_API_KEY=... npm run transcribe:eval-run` — four configs (turbo, large-v3, each ± prompt),
   `--runs 3` requests per clip for a usable p95.
4. **Score** `npm run transcribe:eval-score` — prints and writes `report.md`: WER, accent WER, hallucinations,
   filler retention, WER vs the clean reference, latency p50/p95, and the verdict. Archive that table with the
   model/prompt decision (plan "Verification").

## Metrics

- One normaliser (`normalise.ts`): NFC, lowercase, `’`→`'`, apostrophes/hyphens → space, punctuation stripped,
  **accents kept**. The refine-path guard in the backend must tokenise the same way.
- WER is pooled (sum of errors / sum of reference words), so long clips weigh more.
- Hallucination: any words on a `silence` clip, or a known artefact phrase (Amara, "merci d'avoir regardé", …).
- Filler retention: share of verbatim-reference fillers (`euh heu hum hmm bah ben`) still present.

Results are for your voice only; that is enough for go/no-go.
