# Single-file HTML for the public app

## Status

Accepted

## Context and Problem Statement

The Mapnova GIS viewer needs to be deployable on any static host, testable by opening a file in a browser, and maintainable without requiring contributors to install Node.js, a bundler, or a package manager. Bundlers, frameworks, and module systems each add build infrastructure that can fail, drift out of date, and raise the barrier to contribution. For a public-good project with a small team, that operational overhead is a liability.

Early prototypes using a separate JS bundle were workable but introduced friction: contributors had to run a build step before testing, and the build output had to be kept in sync with the source. The project's primary audience of GIS practitioners and local-government contributors is not necessarily comfortable with JavaScript toolchains.

## Decision

Ship the entire front-end application — HTML, CSS, and JavaScript — as a single `index.html` file with no build step required.

## Consequences

**Positive:**
- Zero build infrastructure: any static host, any CI pipeline, and any contributor machine can serve the file as-is.
- Contributors can open `index.html` directly in a browser and see the application instantly.
- Cloudflare Pages deploys it with zero configuration.
- The entire application is auditable in one place without jumping between files.

**Negative:**
- The file is several thousand lines long and difficult to navigate without editor code folding.
- No native ES modules, tree-shaking, or dead-code elimination; all JavaScript is loaded on every page load.
- No TypeScript, no linting, and no minification without adding a build step — which would contradict this decision.
- Merge conflicts in a large single file are more likely and more painful than in a multi-file project.
