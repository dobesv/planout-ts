# planout-ts

## 1.1.3

### Patch Changes

- 652040c: Restore npm build provenance, which was missing from the 1.1.2 release.

## 1.1.2

### Patch Changes

- 7cd7268: Move the build tooling to Yarn 4 and Changesets 3. No change to the published
  library.

## 1.1.1

### Patch Changes

- 4b18afe: Update the `lodash` dependency to 4.18.1, which carries a security fix.
- 244c3e2: Fix npm authentication in the release workflow, which crashed under yarn 1
  before it could publish.
