import { makeGitcoinClaimerError } from "./makeGitcoinClaimerError.js";

export function checkEnabled(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    if (!this._isEnabled) {
      throw makeGitcoinClaimerError("disabled");
    }
    return originalMethod.apply(this, args);
  };

  return descriptor;
}
