// Evaluation of the authenticatoor token's "services" claim: a
// comma-separated directive list that says which services, and which
// features of a service, the user may use.
//
// This is a port of pkg/auth/services.go from
// ethpandaops/service-authenticatoor (ServiceAllowed / FeatureAllowed) and
// must answer exactly like it; tests/modules/AuthenticatoorServices.spec.ts
// carries the reference implementation's test tables.
//
// Directive grammar:
//
//   directive = [+|-]service(:grantSpec)*
//   grantSpec = feature | -feature | all
//   feature   = name | prefix*
//
//   +faucet                 basic access, no further features
//   +faucet:basic           the same, spelled out
//   +faucet:all             basic + every feature ("+faucet:*" is the same)
//   +faucet:f1:f2           basic + f1 + f2
//   +faucet:all:-f1         basic + every feature except f1
//   +faucet:drop*           basic + every feature starting with "drop"
//   +all:f1                 every service: basic + f1
//   -faucet                 deny the service entirely (features included)
//   -faucet:f1              remove f1, basic access untouched
//
// Evaluation:
//
//   - An empty directive string — a token without the claim, as an
//     authenticatoor without grants mints it — means basic access to
//     every service and nothing more. For a feature it reads like "+all":
//     nothing is said about any feature.
//   - Directives apply left to right, a later verdict overrides an earlier
//     one; inside one directive the segments apply left to right too.
//   - Basic access defaults to ALLOW when no directive matches the
//     service. "-all,+x" is "only x".
//   - Every positive directive grants basic access, whatever features it
//     lists. Only a denial of the service takes it away.
//   - A feature is never allowed without basic access to its service.
//   - A malformed directive is skipped as a whole: it grants nothing and
//     denies nothing.
//   - Whitespace and case are ignored throughout.

// The reserved name that stands for every service (in the service position
// of a directive) and for every feature (in a grant segment).
const GRANT_ALL = "all";

// The reserved feature name for base access to a service: what a bare
// "+svc" directive grants, and what serviceAllowed asks for.
export const FEATURE_BASIC = "basic";

interface IGrantSegment {
  // lowercased feature name, or "all"; for a prefix segment the prefix
  // without the trailing "*".
  name: string;
  // written with a trailing "*": covers every feature starting with name.
  prefix: boolean;
  // takes the grant away: a "-"-signed segment of a positive directive,
  // or any segment of a negative one.
  remove: boolean;
}

interface IDirective {
  // true for "+", false for "-".
  allow: boolean;
  // lowercased service name, or "all".
  service: string;
  // the directive carried grant segments. For a negative directive that
  // makes it a removal of features rather than a denial of the service.
  targeted: boolean;
  segments: IGrantSegment[];
}

enum FeatureState {
  Unset,
  Granted,
  Excluded,
}

// What Go's strings.TrimSpace strips (unicode.IsSpace). String.prototype.trim
// differs in two code points (it strips U+FEFF and keeps U+0085).
const GO_SPACE = "\\t\\n\\v\\f\\r \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const GO_TRIM = new RegExp("^[" + GO_SPACE + "]+|[" + GO_SPACE + "]+$", "g");

function trimSpace(str: string): string {
  return str.replace(GO_TRIM, "");
}

// Go's strings.ToLower maps rune by rune (simple case mapping), while
// String.prototype.toLowerCase applies the full mapping: a context
// dependent final sigma, and U+0130 becoming two code points.
function toLower(str: string): string {
  if(/^[\x00-\x7f]*$/.test(str))
    return str.toLowerCase();
  let out = "";
  for(let ch of str) {
    out += (ch === "İ") ? "i" : ch.toLowerCase();
  }
  return out;
}

// Reports whether the named service is permitted by a directive list (the
// token's "services" claim): "may this token be used against the service
// at all". An empty directive list or an empty service allows.
export function serviceAllowed(directives: string, service: string): boolean {
  if(!directives || !service)
    return true;
  service = toLower(trimSpace(service));
  if(!service)
    return true;

  let allowed = true;
  let parsed = parseDirectives(directives);
  for(let i = 0; i < parsed.length; i++) {
    let d = parsed[i];
    if(!directiveMatches(d, service))
      continue;
    if(d.allow)
      allowed = true;
    else if(!d.targeted)
      allowed = false;
    // A negative directive with segments excludes features only.
  }
  return allowed;
}

// Reports whether a feature of a service may be used under the directive
// list. defaultAllow selects the answer for a feature the list says
// nothing about:
//
//   - false (default-deny): the feature needs its own grant, by name
//     ("+svc:feat"), by wildcard ("+svc:fe*") or by "all" ("+svc:all"),
//     and must not be excluded later. For anything privileged that is
//     handed out deliberately.
//   - true (default-allow): the feature follows basic access unless it was
//     excluded ("-svc:feat", "+svc:all:-feat").
//
//   basic access  state      default-deny   default-allow
//   denied        any        no             no
//   allowed       unset      no             yes
//   allowed       granted    yes            yes
//   allowed       excluded   no             no
//
// NOTE: an EMPTY directive string is basic access to every service and
// nothing more. It passes every service gate, and for a feature it is
// evaluated exactly like "+all" — the row "allowed, unset": allowed under
// default-allow, DENIED under default-deny.
//
// The feature "basic", like an empty feature, asks for the service itself.
// An empty service is refused (except by the service gate under the empty
// directive string, which is open whatever is asked), and so is a feature
// that cannot be a feature name: the reserved word "all", or one
// containing ":", ",", "*" or a leading sign.
export function featureAllowed(directives: string, service: string, feature: string, defaultAllow: boolean): boolean {
  feature = toLower(trimSpace(feature || ""));
  let basic = !feature || feature === FEATURE_BASIC;
  if(!directives) {
    // The service gate of a token without the claim: always open. Any
    // other feature takes the ordinary walk below, which over no
    // directives ends at base access with the feature unset.
    if(basic)
      return true;
    directives = "";
  }
  service = toLower(trimSpace(service || ""));
  if(!service)
    return false;
  if(basic)
    return serviceAllowed(directives, service);
  if(!isQueryName(service) || !isQueryName(feature) || feature === GRANT_ALL)
    return false;

  let base = true;
  let state = FeatureState.Unset;
  let parsed = parseDirectives(directives);
  for(let i = 0; i < parsed.length; i++) {
    let d = parsed[i];
    if(!directiveMatches(d, service))
      continue;
    if(!d.targeted) {
      // A bare directive decides base access. A denial also forgets what
      // was said about the service's features.
      base = d.allow;
      if(!d.allow)
        state = FeatureState.Unset;
      continue;
    }
    if(d.allow)
      base = true; // a positive directive implies base access
    for(let j = 0; j < d.segments.length; j++) {
      let seg = d.segments[j];
      if(!segmentCovers(seg, feature))
        continue;
      state = seg.remove ? FeatureState.Excluded : FeatureState.Granted;
    }
  }

  if(!base)
    return false;
  return state === FeatureState.Granted || (state === FeatureState.Unset && defaultAllow);
}

// Reports whether str can be the service or feature of a feature query:
// non-empty and free of the characters that structure a directive.
function isQueryName(str: string): boolean {
  return str !== "" && !/[:,*]/.test(str) && str[0] !== "-" && str[0] !== "+";
}

function segmentCovers(seg: IGrantSegment, feature: string): boolean {
  if(seg.prefix)
    return feature.startsWith(seg.name);
  if(seg.name === GRANT_ALL)
    return true;
  return seg.name === feature;
}

function directiveMatches(d: IDirective, service: string): boolean {
  return d.service === GRANT_ALL || d.service === service;
}

// Splits a directive list and drops malformed entries.
function parseDirectives(directives: string): IDirective[] {
  let out: IDirective[] = [];
  let parts = directives.split(",");
  for(let i = 0; i < parts.length; i++) {
    let d = parseDirective(parts[i]);
    if(d)
      out.push(d);
  }
  return out;
}

// Parses one entry; null when it is malformed.
function parseDirective(raw: string): IDirective | null {
  raw = trimSpace(raw);
  if(raw.length < 2)
    return null;
  let op = raw[0];
  if(op !== "+" && op !== "-")
    return null;
  let fields = toLower(raw.substring(1)).split(":");
  let name = trimSpace(fields[0]);
  if(!name)
    return null;

  if(fields.length > 1 && name.indexOf("*") !== -1) {
    // No wildcard in the service position. (A bare "+spam*" stays the
    // literal name of a service that does not exist.)
    return null;
  }

  // Check every segment before any of them takes effect: one malformed
  // segment makes the whole directive malformed, wherever it stands.
  let allow = op === "+";
  let checked: { name: string, signed: boolean, prefix: boolean }[] = [];
  for(let i = 1; i < fields.length; i++) {
    let seg = trimSpace(fields[i]);
    let signed = seg.startsWith("-");
    if(signed)
      seg = trimSpace(seg.substring(1));
    if(!seg)
      return null; // "+svc:", "+svc::f", "+svc:-"
    if(signed && !allow)
      return null; // "-svc:-x" has no meaning
    let prefix = false;
    let star = seg.indexOf("*");
    if(star !== -1) {
      if(seg === "*") {
        seg = GRANT_ALL;
      } else if(star === seg.length - 1) {
        seg = seg.substring(0, star);
        prefix = true;
      } else {
        return null; // "us*er", "*admin", "u**"
      }
    }
    if(seg === FEATURE_BASIC && !prefix && signed) {
      // "+svc:-basic": basic access cannot be excluded from a directive
      // that grants it.
      return null;
    }
    checked.push({ name: seg, signed: signed, prefix: prefix });
  }

  let d: IDirective = {
    allow: allow,
    service: name,
    targeted: fields.length > 1,
    segments: [],
  };
  for(let i = 0; i < checked.length; i++) {
    let seg = checked[i];
    if(seg.name === FEATURE_BASIC && !seg.prefix) {
      if(allow) {
        // "+svc:basic": every positive directive grants it.
        continue;
      }
      // "-svc:basic": without basic access nothing is left, so this is
      // the denial of the service.
      return { allow: false, service: name, targeted: false, segments: [] };
    }
    d.segments.push({ name: seg.name, prefix: seg.prefix, remove: seg.signed || !allow });
  }
  return d;
}
