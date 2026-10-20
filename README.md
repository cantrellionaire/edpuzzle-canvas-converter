# Edpuzzle → Canvas

A standalone, browser-only CSV converter. Upload a fresh Canvas gradebook and one or more Edpuzzle exports, check student and assignment matches, and download an assignment-specific Canvas import CSV. Files are read in memory; no server upload, analytics, account, or browser storage is used.

## Safeguards

- Exact unique normalized matches only; ambiguous matches require a manual selection.
- Existing numeric grades, including zero, are protected by default. Optional raise-only and replace policies are explicit. Excused/nonnumeric grades always stay protected.
- Missing/invalid Edpuzzle scores are skipped, never converted to zero. Percentages scale to Canvas assignment points.
- Each output preserves Canvas student IDs and exact assignment header, and includes only proposed changes for that assignment.
- Different source identities mapping to the same student/assignment block that update. Repeated scores for the same identity use the highest percentage.
- Review acknowledgement required before download. Recheck Canvas's own import preview before saving grades.

## Supported exports

Canvas: `Student`, `ID`, assignment headers ending in numeric `(ID)`, and a `Points Possible` row. Export directly from the destination course.

Edpuzzle class gradebook: `Last name`, `First name`, `Username` (optional), and `Edpuzzle: Video title` score columns (0–100). Single-video export: `Role`, `Last name`, `First name`, `Grade (out of 100)`; video name comes from the filename. Unsupported layouts show an error rather than guessing.

Name normalization removes accents and punctuation. Always review matches, particularly students sharing names. The tool cannot independently verify that the two files belong to the same course. Use a fresh Canvas export and check the course before importing.

## Hosting and tests

Static files; no build or dependencies. GitHub Pages: deploy `main` / repository root. Serve locally using any static server. Run `npm test` (Node 18+). The built-in sample uses fictional students only. No live Canvas import or real classroom trial is included in automated tests.

Keep actual gradebooks out of this repository.

## Design and assets

MCC blue (#004b8d) and gold (#ffc20e), with the user-supplied MCC wolf. Drop CSVs into either file panel or use the accessible file picker. Canvas accepts one CSV; Edpuzzle accepts multiple. New file selections reset the grade review.

Edpuzzle mark: https://image.edpuzzle.com/favicons/favicon-32.png
Canvas mark: https://github.com/instructure/canvas-lms/blob/master/public/images/canvas-logo.svg (viewBox cropped to the logomark)

Brand assets are stored locally so opening the page does not request images from third-party servers. Logos remain the property of their respective owners.
