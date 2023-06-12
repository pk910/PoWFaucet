/* tslint:disable */
/* eslint-disable */
/**
* @returns {string}
*/
export function getVersion(): string;
/**
* @param {string} did
* @param {string} input_metadata
* @returns {Promise<any>}
*/
export function resolveDID(did: string, input_metadata: string): Promise<any>;
/**
* @returns {string}
*/
export function generateEd25519Key(): string;
/**
* @param {string} method_pattern
* @param {string} jwk
* @returns {string}
*/
export function keyToDID(method_pattern: string, jwk: string): string;
/**
* @param {string} method_pattern
* @param {string} jwk
* @returns {Promise<any>}
*/
export function keyToVerificationMethod(method_pattern: string, jwk: string): Promise<any>;
/**
* @param {string} credential
* @param {string} proof_options
* @param {string} key
* @returns {Promise<any>}
*/
export function issueCredential(credential: string, proof_options: string, key: string): Promise<any>;
/**
* @param {string} credential
* @param {string} linked_data_proof_options
* @param {string} public_key
* @returns {Promise<any>}
*/
export function prepareIssueCredential(credential: string, linked_data_proof_options: string, public_key: string): Promise<any>;
/**
* @param {string} credential
* @param {string} preparation
* @param {string} signature
* @returns {Promise<any>}
*/
export function completeIssueCredential(credential: string, preparation: string, signature: string): Promise<any>;
/**
* @param {string} vc
* @param {string} proof_options
* @returns {Promise<any>}
*/
export function verifyCredential(vc: string, proof_options: string): Promise<any>;
/**
* @param {string} presentation
* @param {string} proof_options
* @param {string} key
* @returns {Promise<any>}
*/
export function issuePresentation(presentation: string, proof_options: string, key: string): Promise<any>;
/**
* @param {string} presentation
* @param {string} linked_data_proof_options
* @param {string} public_key
* @returns {Promise<any>}
*/
export function prepareIssuePresentation(presentation: string, linked_data_proof_options: string, public_key: string): Promise<any>;
/**
* @param {string} presentation
* @param {string} preparation
* @param {string} signature
* @returns {Promise<any>}
*/
export function completeIssuePresentation(presentation: string, preparation: string, signature: string): Promise<any>;
/**
* @param {string} vp
* @param {string} proof_options
* @returns {Promise<any>}
*/
export function verifyPresentation(vp: string, proof_options: string): Promise<any>;
/**
* @param {string} holder
* @param {string} linked_data_proof_options
* @param {string} key
* @returns {Promise<any>}
*/
export function DIDAuth(holder: string, linked_data_proof_options: string, key: string): Promise<any>;
/**
* @param {string} tz
* @returns {Promise<any>}
*/
export function JWKFromTezos(tz: string): Promise<any>;
/**
* @param {string} capability
* @param {string} linked_data_proof_options
* @param {string} parents
* @param {string} key
* @returns {Promise<any>}
*/
export function delegateCapability(capability: string, linked_data_proof_options: string, parents: string, key: string): Promise<any>;
/**
* @param {string} capability
* @param {string} linked_data_proof_options
* @param {string} parents
* @param {string} public_key
* @returns {Promise<any>}
*/
export function prepareDelegateCapability(capability: string, linked_data_proof_options: string, parents: string, public_key: string): Promise<any>;
/**
* @param {string} capability
* @param {string} preparation
* @param {string} signature
* @returns {Promise<any>}
*/
export function completeDelegateCapability(capability: string, preparation: string, signature: string): Promise<any>;
/**
* @param {string} delegation
* @returns {Promise<any>}
*/
export function verifyDelegation(delegation: string): Promise<any>;
/**
* @param {string} invocation
* @param {string} target_id
* @param {string} linked_data_proof_options
* @param {string} key
* @returns {Promise<any>}
*/
export function invokeCapability(invocation: string, target_id: string, linked_data_proof_options: string, key: string): Promise<any>;
/**
* @param {string} invocation
* @param {string} target_id
* @param {string} linked_data_proof_options
* @param {string} public_key
* @returns {Promise<any>}
*/
export function prepareInvokeCapability(invocation: string, target_id: string, linked_data_proof_options: string, public_key: string): Promise<any>;
/**
* @param {string} invocation
* @param {string} preparation
* @param {string} signature
* @returns {Promise<any>}
*/
export function completeInvokeCapability(invocation: string, preparation: string, signature: string): Promise<any>;
/**
* @param {string} invocation
* @returns {Promise<any>}
*/
export function verifyInvocationSignature(invocation: string): Promise<any>;
/**
* @param {string} invocation
* @param {string} delegation
* @returns {Promise<any>}
*/
export function verifyInvocation(invocation: string, delegation: string): Promise<any>;
