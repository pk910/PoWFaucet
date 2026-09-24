
declare const FAUCET_CLIENT_VERSION: string;
declare const FAUCET_CLIENT_BUILDTIME: number;
/** the commit this bundle was built from, as `bundle/manifest.json` names it */
declare const FAUCET_CLIENT_BUILD: string;

/**
 * Stylesheets are side-effect imports handled by webpack's sass/css loaders;
 * `tsc` needs to be told they exist. A module that carries its own styles imports
 * them from its entry.
 */
declare module "*.scss";
declare module "*.css";
