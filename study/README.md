# Source-verified Study lessons (staging only)

This directory is a **non-deployed staging framework** for replacing the old quiz-derived Study reader with source-verified lessons.

The three Adobe Acrobat links have been recorded in `lesson-content.json`, but **their pages have not been retrieved**. They must not be represented as imported course material until the PDF bytes are available and reviewed.

## Content rules
- Each source must be read page-by-page; confirm titles, topics, numerical values and diagrams.
- Only mark `source.verified=true` after comparison against the original PDF.
- Each lesson must have an ID, title, sourceId, and ordered sections.
- Section fields: heading, body, keyPoints (array), illustration (local PNG under ./images/study/), illustrationAlt, memoryTip.
- Store source page references when importing, then cross-check each point and its illustration.
- Convert only the specific diagrams required for learning to transparent PNG and retain recognizable labels.
- Illustrations can animate slightly with CSS; they must not distort steps or physical procedures.
- Do not merge to `main` while source files are unavailable.

## Integration
Once all lessons are verified, load the JSON and `lesson-player.js`/CSS in the Study route, replacing the current question-bank Study interface. The Questions route, Firebase scoring, and quiz state must remain untouched.
