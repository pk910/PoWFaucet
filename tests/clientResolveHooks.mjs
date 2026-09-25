/**
 * The resolver half of `clientResolve.mjs` - see there for why.
 *
 * Only relative specifiers, only when the default resolution fails, and only the
 * two shapes a bundler would have tried: `<spec>.js` and `<spec>/index.js`.
 */
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  }
  catch(ex) {
    if(!specifier.startsWith("./") && !specifier.startsWith("../"))
      throw ex;
    for(let candidate of [specifier + ".js", specifier + "/index.js"]) {
      try {
        return await next(candidate, context);
      }
      catch(inner) { /* try the next shape */ }
    }
    throw ex;
  }
}
