# GTM Scripts

This repository contains the source for the GTM event script and its minified output.

## Editing

Update `event-scripts.js` directly.

Do not edit `event-scripts.min.js` by hand unless there is a specific reason to override the generated output.

## Minification

On pushes to non-`main` branches, the GitHub Actions workflow minifies `event-scripts.js` into `event-scripts.min.js` and commits the generated file back to the feature branch.

The expectation is that pull requests into `main` already include the updated minified file.