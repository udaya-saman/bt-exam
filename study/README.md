# Pizza Arena Study Academy — verified source edition

This revision replaces the previous quiz-derived Study reader. It **does not** alter Questions, question answers, Firebase scoring, player cards or ranking calculations.

## Source documents

1. `Pizza Hut Training Booklet-2.pdf` — 20 PDF pages → 20 lessons (`content/training.json`)
2. `Gamma Values and Policies.pdf` — 14 PDF pages → 12 lessons (`content/values.json`)
3. `Employee Handbook Final.pdf` — 68 scanned PDF pages → 25 lessons (`content/handbook.json`)

Total: **57 topic-based lessons**. Each contains its PDF source and page range, section explanations, key points and memory cues.

The imported training figures, dated organisational information, and employment arrangements are **specific to these uploaded editions**, not verified as current policy or legal advice. Consult current approved procedures for live operations.

## Interaction and safety

- Search lesson titles, source names, headings and key points.
- Filter by source.
- Animate an existing local transparent PNG mascot and factual flow/timeline memory aids; no SVG.
- Mark lessons as learned; saved in a new isolated `localStorage` key, without changing quiz progress.
- Respect `prefers-reduced-motion`.
- Cache the three small JSON modules, viewer and CSS for offline-first use.
- Render extracted content using `textContent` rather than untrusted HTML.
- The original PDFs were not committed to this public website: the study import consists of concise verified learning notes and page provenance.

## Testing

Verify each PDF page reference against the uploaded PDF, ensure all 57 lessons load, test search/filter/completion and mobile layouts, then verify Questions, Firebase scoring and existing account interfaces still work.
