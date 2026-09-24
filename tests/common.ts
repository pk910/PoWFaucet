/**
 * This repository's own suites' harness - the implementation is `src/testing/harness.ts` now.
 *
 * It moved so that a module package's specs can have it too: they resolve it as
 * `@powfaucet/faucet-testing`, out of `sdk-dist/testing/`, with the same declarations the SDK itself is
 * compiled into. A module cannot import a file from this directory (a published module has no
 * `tests/common.ts` above it), and reaching five directory levels into this repository was what the
 * testing surface removed. This file stays so that 36 suites here did not have to change.
 */
export * from '../src/testing/harness.js';
