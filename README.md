# GTM Scripts

This repository contains the source for the GTM event script and its minified output.

## Editing

Update `event-scripts.js` directly.

Do not edit `event-scripts.min.js` by hand unless there is a specific reason to override the generated output.

## Minification

On pushes that change `event-scripts.js` or the minification workflow, GitHub Actions minifies `event-scripts.js` into `event-scripts.min.js` and commits the generated file back to the branch. Branch protection may prevent this automatic commit.

The expectation is that pull requests into `main` already include the updated minified file.

## Pull Request Check

The `Check event script minification` status check runs on every pull request, regenerates the minified file using the same pinned Terser version, and fails if the committed output differs. It does not commit changes and uses read-only repository permissions.

After the check has run, select `Check event script minification` as a required status check in the branch ruleset for `main`.

Commits pushed by the automatic minification workflow using `GITHUB_TOKEN` do not trigger a new pull request check. To avoid leaving the latest commit without validation, generate and commit the minified file alongside source changes before pushing:

```sh
npx --yes terser@5.44.0 event-scripts.js --compress --mangle --output event-scripts.min.js
```