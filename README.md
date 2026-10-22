# Edpuzzle → Canvas

A standalone, browser-only CSV converter. Upload a fresh Canvas gradebook and one or more Edpuzzle exports, check student and assignment matches, and download one combined Canvas import CSV for all pending assignments, or an assignment-specific CSV. Files are read in memory; no server upload, analytics, account, or browser storage is used.

## Safeguards

- Exact unique normalized matches only; ambiguous matches require a manual selection.
- By default, blanks are filled and lower numeric Canvas grades (including zero and partial scores) are increased. Equal or higher grades and excused/nonnumeric grades stay protected. Optional blank-only and replace policies remain available.
- Missing/invalid Edpuzzle scores are skipped, never converted to zero. Percentages scale to Canvas assignment points.
- Each output preserves Canvas student IDs and exact assignment headers. Only assignments/students with proposed changes are included. In a combined CSV, unchanged cross-cells retain the existing values from the Canvas snapshot (including zero and EX); unrelated assignment columns are omitted.
- Different source identities mapping to the same student/assignment block that update. Repeated scores for the same identity use the highest percentage.
- Review acknowledgement required before download. Recheck Canvas's own import preview before saving grades.

## Supported exports

Canvas: `Student`, `ID`, assignment headers ending in numeric `(ID)`, and a `Points Possible` row. Export directly from the destination course.

Edpuzzle class gradebook: `Last name`, `First name`, `Username` (optional), and `Edpuzzle: Video title` score columns (0–100). Single-video export: `Role`, `Last name`, `First name`, `Grade (out of 100)`; video name comes from the filename. Unsupported layouts show an error rather than guessing.

Name normalization removes accents and punctuation. Always review matches, particularly students sharing names. The tool cannot independently verify that the two files belong to the same course. Use a fresh Canvas export and check the course before importing.

## Hosting and tests

Static files; no build or dependencies. GitHub Pages: deploy `main` / repository root. Serve locally using any static server. Run `npm test` (Node 18+). Automated tests use fictional students only. No live Canvas import or real classroom trial is included in automated tests.

Keep actual gradebooks out of this repository.

## Design and assets

MCC blue (#004b8d) and gold (#ffc20e), with the user-supplied MCC wolf. Drop CSVs into either file panel or use the accessible file picker. Canvas accepts one CSV; Edpuzzle accepts multiple, additive selections. Each queued file can be removed. Adding/removing files resets the review acknowledgement; successful files stay cached in memory and a failed file does not block the others.

Edpuzzle mark: https://image.edpuzzle.com/favicons/favicon-32.png
Canvas mark: https://github.com/instructure/canvas-lms/blob/master/public/images/canvas-logo.svg (viewBox cropped to the logomark)

Brand assets are stored locally so opening the page does not request images from third-party servers. Logos remain the property of their respective owners.

## Updating in-progress scores

Export fresh CSVs from both systems each time. The default increase-only policy replaces earlier partial grades with higher Edpuzzle scores. A CSV score alone does not establish completion, so partial scores may still be included; export after students finish if you want only final grades. Review the proposed changes before importing into Canvas.

## Multiple assignments and pending downloads

1. Choose one fresh Canvas gradebook from the destination course.
2. Add Edpuzzle CSVs together or one at a time. Later selections add to the queue. Exact duplicates with the same filename and content are skipped; changed versions remain eligible. A single class-gradebook export can already contain multiple video columns.
3. Click **Check and match**. Files are read sequentially, with per-file results. Failed files can be removed/replaced or retried by checking again; valid files are not re-read or duplicated. Unsupported files never become guessed assignments.
4. Review names, assignment matches, skipped scores, and every proposed grade. Unmatched/ambiguous items remain excluded. Repeated records for the same identity/assignment use the highest percentage, as before; different identities targeting the same grade remain blocked.
5. Check the acknowledgement, then **Export all pending** for one combined CSV. **Export one assignment** remains available for targeted exports or a re-download.
6. Import the file manually in Canvas and review Canvas's own changes before saving. No grades are sent automatically, and this tool does not change late policies, completion status, or posting policies.

“Pending” means an assignment's current reviewed output has not had a download requested in this tab. This is not Canvas import/sync status. An unchanged successful export is excluded from the next batch; adding a higher/new score makes the changed assignment pending again. Failed download attempts remain pending. Because a browser can silently block a download, **Reset download status** permits a deliberate retry. Reloading/clearing the tab or replacing the Canvas gradebook resets download tracking. Nothing is persisted.

Use a fresh Canvas export after importing and whenever grades may have changed. Combined CSVs carry unchanged cross-cell values from that snapshot, so a stale snapshot can contain stale values. Canvas's manual import preview remains the final check. The format follows [Canvas's gradebook import guide](https://community.instructure.com/en/kb/articles/660862-how-do-i-import-grades-in-the-gradebook).

Tests include fictional multi-assignment exports, duplicate names/files, conflicting matches, protected/zero/partial grades, cross-cell preservation, per-file failure/retry isolation, download fingerprint tracking, and DOM-mock checks for additive selections, interrupted reads, acknowledgement resets, and failed downloads. DOM mocks are not a substitute for browser visual QA.
