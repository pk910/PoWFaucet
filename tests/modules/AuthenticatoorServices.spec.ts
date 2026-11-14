import 'mocha';
import { expect } from 'chai';
import { FEATURE_BASIC, featureAllowed, serviceAllowed } from '../../src/modules/authenticatoor/AuthenticatoorServices.js';

// Port of pkg/auth/services_test.go from ethpandaops/service-authenticatoor.
// The tables are the reference implementation's rows, unchanged and in the
// same order, so the TypeScript port is checked against it case by case.
// When the Go tables change, change these with them.

// What a directive list says about one feature; see featureAllowed.
const unset = "unset";
const granted = "granted";
const excluded = "excluded";

// Asserts the answer in both modes (Go: FeatureDefaultDeny / FeatureDefaultAllow).
function checkFeature(directives: string, service: string, feature: string, wantDeny: boolean, wantAllow: boolean) {
  let query = "(" + [directives, service, feature].map((s) => JSON.stringify(s)).join(", ");
  expect(featureAllowed(directives, service, feature, false)).to.equal(wantDeny, "featureAllowed" + query + ", default-deny)");
  expect(featureAllowed(directives, service, feature, true)).to.equal(wantAllow, "featureAllowed" + query + ", default-allow)");
}

// A verbatim port of ServiceAllowed as released in service-authenticatoor
// v0.0.3, before directives could carry feature grants. Reference only.
function legacyServiceAllowed(directives: string, service: string): boolean {
  if(directives === "" || service === "")
    return true;
  service = service.trim().toLowerCase();
  if(service === "")
    return true;

  let allowed = true;
  for(let raw of directives.split(",")) {
    raw = raw.trim();
    if(raw.length < 2)
      continue;
    let op = raw[0];
    if(op !== "+" && op !== "-")
      continue;
    let name = raw.substring(1).trim().toLowerCase();
    if(name === "")
      continue;
    if(name !== "all" && name !== service)
      continue;
    allowed = op === "+";
  }
  return allowed;
}

// The rule for a token without a services claim, stated independently of
// the implementation (Go: emptyClaimWant): basic access to every service
// and nothing more. The service gate ("basic" or an empty feature) is open
// whatever is asked. Any other feature is allowed under default-allow and
// denied under default-deny, and refused in both modes when the service or
// the feature cannot be a query name. Returns [wantDeny, wantAllow].
function emptyClaimWant(service: string, feature: string): [boolean, boolean] {
  let isName = (s: string) => s !== "" && !/[:,*]/.test(s) && !s.startsWith("-") && !s.startsWith("+");
  let f = feature.trim().toLowerCase();
  if(f === "" || f === "basic")
    return [true, true];
  if(!isName(service.trim().toLowerCase()) || !isName(f) || f === "all")
    return [false, false];
  return [false, true];
}

// Small deterministic generator for the generated cases (mulberry32).
function newRng(seed: number): (n: number) => number {
  let a = seed >>> 0;
  return (n: number) => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
  };
}

describe("Faucet module: authenticatoor (services claim)", () => {

  describe("serviceAllowed (Go: TestServiceAllowed)", () => {
    // name, directives, service, want
    const cases: [string, string, string, boolean][] = [
    ["empty directives default allow", "", "spamoor", true],
    ["empty service short-circuits to allow", "-all", "", true],
    ["plus all allows", "+all", "spamoor", true],
    ["minus all denies", "-all", "spamoor", false],
    ["plus all minus self denies self", "+all,-spamoor", "spamoor", false],
    ["plus all minus other allows self", "+all,-buildoor", "spamoor", true],
    ["minus all plus self allows self", "-all,+spamoor", "spamoor", true],
    ["minus all plus other denies self", "-all,+buildoor", "spamoor", false],
    ["later wins (allow then deny)", "+spamoor,-spamoor", "spamoor", false],
    ["later wins (deny then allow)", "-spamoor,+spamoor", "spamoor", true],
    ["all overrides earlier specific", "-spamoor,+all", "spamoor", true],
    ["specific overrides earlier all", "+all,-spamoor", "spamoor", false],
    ["unrelated directives default allow", "+buildoor,-monitoring", "spamoor", true],
    ["case insensitive name", "+ALL,-Spamoor", "spamoor", false],
    ["case insensitive service", "+all,-spamoor", "SPAMOOR", false],
    ["whitespace tolerated", " +all , -spamoor ", "spamoor", false],
    ["missing prefix skipped", "all,-spamoor", "spamoor", false],
    ["empty name skipped", "+,-spamoor", "spamoor", false],
    ["single char skipped", "+", "spamoor", true],
    ["only minus all", "-all", "buildoor", false],
    ["complex chain", "-all,+spamoor,+buildoor,-buildoor", "buildoor", false],
    ["complex chain other", "-all,+spamoor,+buildoor,-buildoor", "spamoor", true],
    ];
    cases.forEach(([name, directives, service, want]) => {
      it(name, () => {
        expect(serviceAllowed(directives, service)).to.equal(want,
          "serviceAllowed(" + JSON.stringify(directives) + ", " + JSON.stringify(service) + ")");
      });
    });
  });

  // Every documented directive form. Each row states what the list means for
  // the queried service (base access) and feature (unset / granted /
  // excluded); the expected answer in both modes follows from the truth table.
  describe("featureAllowed: grammar (Go: TestFeatureAllowed_Grammar)", () => {
    // name, directives, service, feature, wantBase, wantState
    const cases: [string, string, string, string, boolean, string][] = [
    // ─── the documented forms ───────────────────────────────────────
    ["+svc: base, nothing about features", "+spamoor", "spamoor", "plugins", true, unset],
    ["+svc:all: every feature", "+spamoor:all", "spamoor", "plugins", true, granted],
    ["+svc:f1:f2: first", "+spamoor:f1:f2", "spamoor", "f1", true, granted],
    ["+svc:f1:f2: second", "+spamoor:f1:f2", "spamoor", "f2", true, granted],
    ["+svc:f1:f2: another", "+spamoor:f1:f2", "spamoor", "f3", true, unset],
    ["+svc:all:-f: the exception", "+spamoor:all:-plugins", "spamoor", "plugins", true, excluded],
    ["+svc:all:-f: the rest", "+spamoor:all:-plugins", "spamoor", "txpool", true, granted],
    ["+svc:-f: excluded, base granted", "+spamoor:-plugins", "spamoor", "plugins", true, excluded],
    ["+svc:-f: the rest stays unset", "+spamoor:-plugins", "spamoor", "txpool", true, unset],
    ["+all:f: any service", "+all:feata", "buildoor", "feata", true, granted],
    ["+all:f: another feature", "+all:feata", "buildoor", "featb", true, unset],
    ["-svc: base gone", "-spamoor", "spamoor", "plugins", false, unset],
    ["-svc after a grant: base and feature gone", "+spamoor:all,-spamoor", "spamoor", "plugins", false, unset],
    ["-svc:f: the feature", "-spamoor:f1", "spamoor", "f1", true, excluded],
    ["-svc:f: the others", "-spamoor:f1", "spamoor", "f2", true, unset],
    ["-svc:f after +svc:all: the feature", "+spamoor:all,-spamoor:f1", "spamoor", "f1", true, excluded],
    ["-svc:f after +svc:all: the others", "+spamoor:all,-spamoor:f1", "spamoor", "f2", true, granted],

    // ─── basic: the reserved name of base access ────────────────────
    ["+svc:basic is +svc", "-all,+spamoor:basic", "spamoor", "plugins", true, unset],
    ["+svc:basic:f", "-all,+spamoor:basic:plugins", "spamoor", "plugins", true, granted],
    ["-svc:basic is -svc", "+spamoor:all,-spamoor:basic", "spamoor", "plugins", false, unset],
    ["-svc:basic forgets features like -svc", "+spamoor:f1,-spamoor:basic,+spamoor", "spamoor", "f1", true, unset],
    ["-svc:f:basic is still the denial", "+spamoor:all,-spamoor:f1:basic", "spamoor", "f2", false, unset],
    ["-all:basic is -all", "+spamoor,-all:basic", "spamoor", "plugins", false, unset],
    ["+svc:-basic: malformed, the directive grants nothing", "-all,+spamoor:-basic", "spamoor", "plugins", false, unset],
    ["+svc:all:-basic: malformed, the directive grants nothing", "-all,+spamoor:all:-basic", "spamoor", "plugins", false, unset],
    ["+svc:f:-basic: not even the feature before it", "-all,+spamoor,+spamoor:plugins:-basic", "spamoor", "plugins", true, unset],
    ["-svc:-basic: malformed, the directive denies nothing", "+spamoor:all,-spamoor:-basic", "spamoor", "plugins", true, granted],
    ["-svc:f leaves basic alone", "-all,+spamoor,-spamoor:plugins", "spamoor", "txpool", true, unset],
    ["all does not need to name basic", "-all,+spamoor:all", "spamoor", "txpool", true, granted],

    // ─── defaults ───────────────────────────────────────────────────
    ["nothing matches the service", "+buildoor:all", "spamoor", "plugins", true, unset],
    ["only a denial elsewhere", "-buildoor", "spamoor", "plugins", true, unset],
    ["-all", "-all", "spamoor", "plugins", false, unset],
    ["+all: base everywhere", "+all", "spamoor", "plugins", true, unset],
    ["+all:all: everything", "+all:all", "spamoor", "plugins", true, granted],

    // ─── interaction with -all,+svc ─────────────────────────────────
    ["-all,+svc: the service", "-all,+spamoor", "spamoor", "plugins", true, unset],
    ["-all,+svc: another service", "-all,+spamoor", "buildoor", "plugins", false, unset],
    ["-all,+svc,+svc:f: the feature", "-all,+spamoor,+spamoor:plugins", "spamoor", "plugins", true, granted],
    ["-all,+svc,+svc:f: another feature", "-all,+spamoor,+spamoor:plugins", "spamoor", "txpool", true, unset],
    ["-all,+svc,+svc:f: another service", "-all,+spamoor,+spamoor:plugins", "buildoor", "plugins", false, unset],
    ["-all,+svc,-svc:f", "-all,+spamoor,-spamoor:plugins", "spamoor", "plugins", true, excluded],
    ["feature directive implies base", "-all,+spamoor:plugins", "spamoor", "plugins", true, granted],
    ["exclusion segment still implies base", "-all,+spamoor:-plugins", "spamoor", "plugins", true, excluded],
    ["+all:f implies base everywhere", "-all,+all:feata", "buildoor", "feata", true, granted],
    ["+all,+all:all", "+all,+all:all", "buildoor", "anything", true, granted],

    // ─── order: later wins ──────────────────────────────────────────
    ["+svc:all,-svc:f", "+spamoor:all,-spamoor:f", "spamoor", "f", true, excluded],
    ["-svc:f,+svc:all", "-spamoor:f,+spamoor:all", "spamoor", "f", true, granted],
    ["+svc:all:-f", "+spamoor:all:-f", "spamoor", "f", true, excluded],
    ["+svc:-f:all", "+spamoor:-f:all", "spamoor", "f", true, granted],
    ["+svc:-all:f: the feature", "+spamoor:-all:plugins", "spamoor", "plugins", true, granted],
    ["+svc:-all:f: another", "+spamoor:-all:plugins", "spamoor", "txpool", true, excluded],
    ["grant then exclusion", "+spamoor:f1,-spamoor:f1", "spamoor", "f1", true, excluded],
    ["exclusion then grant", "-spamoor:f1,+spamoor:f1", "spamoor", "f1", true, granted],
    ["denial then grant", "-spamoor,+spamoor:f1", "spamoor", "f1", true, granted],
    ["grant, denial, bare re-allow: forgotten", "+spamoor:f1,-spamoor,+spamoor", "spamoor", "f1", true, unset],
    ["exclusion, denial, bare re-allow: forgotten", "-spamoor:f1,-spamoor,+spamoor", "spamoor", "f1", true, unset],
    ["a bare positive keeps an earlier grant", "+spamoor:f1,+spamoor", "spamoor", "f1", true, granted],
    ["a bare positive keeps an earlier exclusion", "-spamoor:f1,+spamoor", "spamoor", "f1", true, excluded],
    ["a later positive adds features", "+spamoor:f1,+spamoor:f2", "spamoor", "f1", true, granted],
    ["-svc:all excludes every feature, base stays", "+spamoor:f1:f2,-spamoor:all", "spamoor", "f2", true, excluded],
    ["-all after grants", "+spamoor:all,-all", "spamoor", "plugins", false, unset],

    // ─── +all:f and -all:f across services ──────────────────────────
    ["+all:f then +svc:g: the service", "+all:feata,+spamoor:featb", "spamoor", "featb", true, granted],
    ["+all:f then +svc:g: keeps the all feature", "+all:feata,+spamoor:featb", "spamoor", "feata", true, granted],
    ["+all:f then +svc:g: other services", "+all:feata,+spamoor:featb", "buildoor", "featb", true, unset],
    ["+svc:f then +all:-f", "+spamoor:f1,+all:-f1", "spamoor", "f1", true, excluded],
    ["-all:f excludes everywhere", "-all:feata", "spamoor", "feata", true, excluded],
    ["-all:f excludes everywhere: another service", "-all:feata", "buildoor", "feata", true, excluded],
    ["-all:f leaves base and other features", "+all:all,-all:feata", "spamoor", "featb", true, granted],
    ["-all:f after +all:all", "+all:all,-all:feata", "buildoor", "feata", true, excluded],
    ["-all:f then +svc:f: that service again", "-all:feata,+spamoor:feata", "spamoor", "feata", true, granted],
    ["-all:f then +svc:f: the others stay excluded", "-all:feata,+spamoor:feata", "buildoor", "feata", true, excluded],
    ["+all:all:-f then a service: f for it only", "+all:all:-featb,+spamoor:featb", "buildoor", "featb", true, excluded],

    // ─── wildcards: a trailing * is a prefix ────────────────────────
    ["prefix: the bare name", "+spamoor:user*", "spamoor", "user", true, granted],
    ["prefix: a longer name", "+spamoor:user*", "spamoor", "userxyz", true, granted],
    ["prefix: with a dash", "+spamoor:user*", "spamoor", "user-admin", true, granted],
    ["prefix: not a shorter name", "+spamoor:user*", "spamoor", "use", true, unset],
    ["prefix: not another name", "+spamoor:user*", "spamoor", "admin-user", true, unset],
    ["prefix: another service", "-all,+spamoor:user*", "buildoor", "user", false, unset],
    ["prefix on all services", "+all:user*", "buildoor", "user-view", true, granted],
    ["prefix exclusion", "+spamoor:all,-spamoor:user*", "spamoor", "user-admin", true, excluded],
    ["prefix exclusion: the rest", "+spamoor:all,-spamoor:user*", "spamoor", "plugins", true, granted],
    ["prefix exclusion inside a positive directive", "+spamoor:all:-user*", "spamoor", "user", true, excluded],
    ["prefix exclusion inside: the rest", "+spamoor:all:-user*", "spamoor", "plugins", true, granted],
    ["prefix then exact exclusion: the excluded one", "+spamoor:user*,-spamoor:user-admin", "spamoor", "user-admin", true, excluded],
    ["prefix then exact exclusion: the others", "+spamoor:user*,-spamoor:user-admin", "spamoor", "user-view", true, granted],
    ["exact exclusion then prefix: both allowed", "-spamoor:user-admin,+spamoor:user*", "spamoor", "user-admin", true, granted],
    ["exact exclusion then prefix: the other", "-spamoor:user-admin,+spamoor:user*", "spamoor", "user-view", true, granted],
    ["segments: prefix then exclusion", "+spamoor:user*:-user-admin", "spamoor", "user-admin", true, excluded],
    ["segments: exclusion then prefix", "+spamoor:-user-admin:user*", "spamoor", "user-admin", true, granted],
    ["a lone * is all", "+spamoor:*", "spamoor", "anything", true, granted],
    ["a lone -* is -all", "+spamoor:f1:-*", "spamoor", "f1", true, excluded],
    ["-svc:* excludes every feature, base stays", "+spamoor:all,-spamoor:*", "spamoor", "f1", true, excluded],
    ["prefix case and whitespace", "+spamoor: User* ", "spamoor", "USER-view", true, granted],
    ["prefix never removes basic", "-all,+spamoor,-spamoor:b*", "spamoor", "backup", true, excluded],
    ["prefix b* grants b-features, basic comes from the directive", "-all,+spamoor:b*", "spamoor", "backup", true, granted],
    ["prefix basi* is not basic", "+spamoor,-spamoor:basi*", "spamoor", "plugins", true, unset],
    ["prefix basic* is a prefix, not the reserved name", "+spamoor:all,-spamoor:basic*", "spamoor", "basic-stats", true, excluded],
    ["prefix al* is not all", "+spamoor:al*", "spamoor", "plugins", true, unset],
    ["prefix al* covers names starting al", "+spamoor:al*", "spamoor", "alerts", true, granted],

    // ─── malformed wildcards: the whole directive is skipped ────────
    ["* in the middle: grants nothing", "-all,+spamoor:us*er", "spamoor", "user", false, unset],
    ["* in the middle: not the other segments either", "-all,+spamoor:us*er:f1", "spamoor", "f1", false, unset],
    ["* in the middle: nor a segment before it", "-all,+spamoor,+spamoor:f1:us*er", "spamoor", "f1", true, unset],
    ["* at the start", "-all,+spamoor:*admin:f1", "spamoor", "f1", false, unset],
    ["two stars", "-all,+spamoor:u**", "spamoor", "user", false, unset],
    ["malformed wildcard in a negative directive: no denial, no exclusion", "+spamoor:all,-spamoor:us*er:f1", "spamoor", "f1", true, granted],
    ["malformed exclusion wildcard: the directive grants nothing", "+spamoor:all:-us*er", "spamoor", "user", true, unset],
    ["malformed exclusion wildcard: not even basic", "-all,+spamoor:all:-us*er", "spamoor", "plugins", false, unset],
    ["wildcard in the service position", "-all,+spam*:f1", "spamoor", "f1", false, unset],
    ["wildcard as the whole service", "-all,+*:f1", "spamoor", "f1", false, unset],
    ["bare wildcard service is a literal name, as before", "-all,+spam*", "spamoor", "f1", false, unset],

    // ─── malformed entries are skipped ──────────────────────────────
    ["no prefix", "spamoor:all", "spamoor", "plugins", true, unset],
    ["empty service name", "+:all", "spamoor", "plugins", true, unset],
    ["trailing colon: positive", "-all,+spamoor:", "spamoor", "plugins", false, unset],
    ["trailing colon: negative is not a denial", "+spamoor:all,-spamoor:", "spamoor", "plugins", true, granted],
    ["empty segment in the middle", "-all,+spamoor::plugins", "spamoor", "plugins", false, unset],
    ["a lone sign as a segment", "-all,+spamoor:-", "spamoor", "plugins", false, unset],
    ["an empty segment after basic: not a denial", "+spamoor:all,-spamoor:basic:", "spamoor", "plugins", true, granted],
    ["an empty segment after a feature and basic", "+spamoor:all,-spamoor:f1:basic::", "spamoor", "f1", true, granted],
    ["an empty segment before basic", "+spamoor:all,-spamoor::basic", "spamoor", "plugins", true, granted],
    ["a malformed wildcard after basic: not a denial", "+spamoor:all,-spamoor:basic:us*er", "spamoor", "plugins", true, granted],
    ["signed segment in a negative directive", "+spamoor:all,-spamoor:-x", "spamoor", "x", true, granted],
    ["signed segment in a negative directive: base", "-spamoor:-x", "spamoor", "x", true, unset],
    ["a signed segment makes the negative directive malformed: nothing excluded", "+spamoor:all,-spamoor:-x:y", "spamoor", "y", true, granted],
    ["a signed segment before basic: not a denial", "+spamoor:all,-spamoor:-x:basic", "spamoor", "y", true, granted],
    ["malformed entries between good ones", "-all,nonsense,+spamoor:f1,+", "spamoor", "f1", true, granted],

    // ─── case and whitespace ────────────────────────────────────────
    ["case in the claim", "+SpaMoor:PluGins", "spamoor", "plugins", true, granted],
    ["case in the query", "+spamoor:plugins", "SPAMOOR", "Plugins", true, granted],
    ["whitespace everywhere", " -all , + spamoor : f1 : - f2 ", " spamoor ", " f1 ", true, granted],
    ["whitespace: exclusion segment", " -all , + spamoor : all : - f2 ", "spamoor", "f2", true, excluded],

    // ─── exact names only ───────────────────────────────────────────
    ["no prefix matching of features", "+spamoor:plugins", "spamoor", "plug", true, unset],
    ["no prefix matching of services", "+spamoor:all", "spam", "plugins", true, unset],
    ];
    cases.forEach(([name, directives, service, feature, wantBase, wantState]) => {
      it(name, () => {
        expect(serviceAllowed(directives, service)).to.equal(wantBase,
          "serviceAllowed(" + JSON.stringify(directives) + ", " + JSON.stringify(service) + ")");
        let wantDeny = wantBase && wantState === granted;
        let wantAllow = wantBase && wantState !== excluded;
        checkFeature(directives, service, feature, wantDeny, wantAllow);

        // "basic" is base access, in both modes.
        checkFeature(directives, service, "basic", wantBase, wantBase);
        checkFeature(directives, service, " Basic ", wantBase, wantBase);

        // Never a feature without base access, in either mode.
        if(!wantBase) {
          expect(featureAllowed(directives, service, feature, false)).to.equal(false, "default-deny allows without base access");
          expect(featureAllowed(directives, service, feature, true)).to.equal(false, "default-allow allows without base access");
        }
      });
    });
  });

  // The documented table, literally: base access denied / allowed × feature
  // unset / granted / excluded × both modes. A token without the claim is
  // the row "allowed, unset".
  describe("featureAllowed: truth table (Go: TestFeatureAllowed_TruthTable)", () => {
    // name, directives, wantBase, wantDeny, wantAllow
    const cases: [string, string, boolean, boolean, boolean][] = [
    ["base denied, unset", "-all", false, false, false],
    ["base denied, granted before the denial", "+dora:roll,-dora", false, false, false],
    ["base denied, granted for every service before the denial", "+all:roll,-dora", false, false, false],
    ["base denied, excluded before the denial", "-dora:roll,-dora", false, false, false],
    ["base denied by -all, granted before", "+dora:all,-all", false, false, false],
    ["base allowed, unset", "-all,+dora", true, false, true],
    ["base allowed by default, unset", "+spamoor", true, false, true],
    ["base allowed, granted", "-all,+dora,+dora:roll", true, true, true],
    ["base allowed, granted by all", "-all,+dora,+dora:all", true, true, true],
    ["base allowed, excluded", "-all,+dora,-dora:roll", true, false, false],
    ["base allowed, excluded inside a grant of all", "+dora:all:-roll", true, false, false],
    ["empty claim: base allowed, unset", "", true, false, true],
    ];
    cases.forEach(([name, directives, wantBase, wantDeny, wantAllow]) => {
      it(name, () => {
        expect(serviceAllowed(directives, "dora")).to.equal(wantBase, "serviceAllowed(" + JSON.stringify(directives) + ")");
        checkFeature(directives, "dora", "roll", wantDeny, wantAllow);
        expect(!wantBase && (wantDeny || wantAllow)).to.equal(false, "test bug: a row allows a feature without base access");
      });
    });
  });

  // Queries that do not name a service and a feature in the ordinary way.
  describe("featureAllowed: arguments (Go: TestFeatureAllowed_Arguments)", () => {
    // name, directives, service, feature, wantDeny, wantAllow
    const cases: [string, string, string, string, boolean, boolean][] = [
    // The empty claim is basic access to every service and nothing
    // more: the service gate is open, a feature reads as under "+all".
    ["empty claim", "", "spamoor", "plugins", false, true],
    ["empty claim, empty feature", "", "spamoor", "", true, true],
    ["empty claim, blank feature", "", "spamoor", "  ", true, true],
    ["empty claim, empty service", "", "", "plugins", false, false],
    ["empty claim, blank service", "", "   ", "plugins", false, false],
    ["empty claim, empty service, basic", "", "", "basic", true, true],
    ["empty claim, empty service and feature", "", "", "", true, true],
    ["empty claim, reserved feature name", "", "spamoor", "all", false, false],
    ["empty claim, wildcard feature", "", "spamoor", "user*", false, false],
    ["empty claim, lone * as the feature", "", "spamoor", "*", false, false],
    ["empty claim, signed feature", "", "spamoor", "-plugins", false, false],
    ["empty claim, feature with a colon", "", "spamoor", "a:b", false, false],
    ["empty claim, feature with a comma", "", "spamoor", "a,+all", false, false],
    ["empty claim, service with a colon", "", "spamoor:plugins", "x", false, false],
    ["empty claim, wildcard service", "", "spam*", "f1", false, false],
    ["empty claim, service all", "", "all", "f1", false, true],
    ["empty claim, case and whitespace", "", " SPAMOOR ", " Plugins ", false, true],

    // The same queries under "+all", which the empty claim reads like.
    ["+all", "+all", "spamoor", "plugins", false, true],
    ["+all, reserved feature name", "+all", "spamoor", "all", false, false],
    ["+all, empty service", "+all", "", "plugins", false, false],

    // A whitespace or garbage claim reads the same for a feature.
    ["whitespace claim: base by default, nothing granted", " ", "spamoor", "plugins", false, true],
    ["garbage claim: base by default, nothing granted", "nonsense", "spamoor", "plugins", false, true],

    // An empty feature asks for the service itself.
    ["empty feature, service allowed", "-all,+spamoor", "spamoor", "", true, true],
    ["empty feature, service denied", "-all,+spamoor", "buildoor", "", false, false],
    ["blank feature, service allowed", "-all,+spamoor", "spamoor", "  ", true, true],

    // "basic" asks for the service itself too.
    ["basic, service allowed", "-all,+spamoor", "spamoor", "basic", true, true],
    ["basic, service denied", "-all,+spamoor", "buildoor", "basic", false, false],
    ["basic, service nothing mentions: allowed by default", "+spamoor,+buildoor", "other", "basic", true, true],
    ["basic under the empty claim", "", "spamoor", "basic", true, true],
    ["basic under the empty claim, spelled otherwise", "", "spamoor", " Basic ", true, true],

    // An empty service is refused, although ServiceAllowed lets it through.
    ["empty service, basic", "+all:all", "", "basic", false, false],
    ["empty service", "+all:all", "", "plugins", false, false],
    ["blank service", "+all:all", "   ", "plugins", false, false],
    ["empty service and feature", "+all:all", "", "", false, false],

    // Names that cannot be a feature or a service.
    ["reserved feature name all", "+spamoor:all", "spamoor", "all", false, false],
    ["signed feature", "+spamoor:-plugins", "spamoor", "-plugins", false, false],
    ["feature with a colon", "+spamoor:a:b", "spamoor", "a:b", false, false],
    ["feature with a comma", "+spamoor:a", "spamoor", "a,+all", false, false],
    ["service with a colon", "+all:all", "spamoor:plugins", "x", false, false],

    // Wildcards exist in directives only.
    ["wildcard feature query", "+spamoor:user*", "spamoor", "user*", false, false],
    ["wildcard feature query against all", "+all:all", "spamoor", "user*", false, false],
    ["lone * as the feature", "+spamoor:all", "spamoor", "*", false, false],
    ["wildcard service query", "+all:all", "spam*", "f1", false, false],

    // The pseudo-service all matches only all-directives.
    ["service all, all directive", "+all:f1", "all", "f1", true, true],
    ["service all, specific directive", "+spamoor:f1", "all", "f1", false, true],
    ];
    cases.forEach(([name, directives, service, feature, wantDeny, wantAllow]) => {
      it(name, () => {
        checkFeature(directives, service, feature, wantDeny, wantAllow);
      });
    });

    it("an absent claim or query argument is the empty one", () => {
      expect(serviceAllowed(undefined as any, "spamoor")).to.equal(true);
      expect(serviceAllowed(null as any, "spamoor")).to.equal(true);
      expect(serviceAllowed("-all", undefined as any)).to.equal(true);
      checkFeature(undefined as any, "spamoor", "plugins", false, true);
      checkFeature(null as any, "spamoor", "plugins", false, true);
      checkFeature(undefined as any, "spamoor", "basic", true, true);
      checkFeature(undefined as any, "spamoor", undefined as any, true, true);
      checkFeature(undefined as any, undefined as any, "plugins", false, false);
      checkFeature(undefined as any, "spamoor", "all", false, false);
      checkFeature("+all:all", undefined as any, "plugins", false, false);
      checkFeature("-all,+spamoor", "spamoor", undefined as any, true, true);
    });
  });

  // Every combination of a set of services and features — ordinary,
  // reserved, malformed, in odd case and whitespace — against the empty
  // directive string, compared with the rule (emptyClaimWant). For every
  // feature but the service gate the answer is also the one "+all" gives.
  it("featureAllowed: the empty claim is basic access only (Go: TestFeatureAllowed_EmptyClaimIsBasicAccessOnly)", () => {
    let services = [
      "spamoor", "SPAMOOR", " spamoor ", "my-service", "other", "all", "basic", "x",
      "", "   ", "*", "spam*", "spamoor:plugins", "a,b", "-spamoor", "+spamoor",
    ];
    let features = [
      "plugins", "PLUGINS", " plugins ", "f1", "user-admin", "roll", "basics", "allx", "b",
      "", "  ", "basic", " Basic ", "BASIC", "all", "ALL", " all ",
      "*", "user*", "us*er", "a:b", "a,b", "a,+all", "-plugins", "+plugins", "-", "+", ":", ",",
    ];
    let plain = 0, refused = 0, gate = 0;
    for(let service of services) {
      expect(serviceAllowed("", service)).to.equal(true, "the empty claim allows every service: " + JSON.stringify(service));
      for(let feature of features) {
        let [wantDeny, wantAllow] = emptyClaimWant(service, feature);
        checkFeature("", service, feature, wantDeny, wantAllow);

        if(wantDeny) {
          gate++;
          continue; // the service gate; "+all" refuses it for an empty service
        }
        if(wantAllow) plain++; else refused++;
        // The rule, said the other way: exactly as under "+all".
        checkFeature("+all", service, feature, wantDeny, wantAllow);
      }
    }
    expect(plain > 0 && refused > 0 && gate > 0).to.equal(true,
      "the cases are one-sided: plain=" + plain + " refused=" + refused + " gate=" + gate);
  });

  // The differences to the v0.0.3 evaluator for directive lists with a ":".
  describe("serviceAllowed: lists with a colon (Go: TestServiceAllowed_DiffersFromV003WithColons)", () => {
    // name, directives, service, v003, current
    const cases: [string, string, string, boolean, boolean][] = [
    ["a feature directive alone grants basic access now", "-all,+spamoor:x", "spamoor", false, true],
    ["+all with a feature grants basic access everywhere now", "-all,+all:x", "spamoor", false, true],
    ["-a:b was a denial of a service named a:b", "-a:b", "a:b", false, true],
    ["-spamoor:basic denies the service now", "-spamoor:basic", "spamoor", true, false],

    // The same intent written the compatible way reads the same.
    ["compatible: the bare directive repeated", "-all,+spamoor,+spamoor:x", "spamoor", true, true],
    ["compatible: +all repeated", "-all,+all,+all:x", "spamoor", true, true],
    ["compatible: a plain denial", "-spamoor", "spamoor", false, false],
    ];
    cases.forEach(([name, directives, service, v003, current]) => {
      it(name, () => {
        expect(legacyServiceAllowed(directives, service)).to.equal(v003, "v0.0.3");
        expect(serviceAllowed(directives, service)).to.equal(current, "current");
      });
    });
  });

  // For every directive list WITHOUT a ":" base-access evaluation is the
  // one of v0.0.3.
  it("serviceAllowed: same as v0.0.3 without colons (Go: TestServiceAllowed_SameAsV003WithoutColons)", () => {
    let queries: [string, string][] = [
    ["", "spamoor"],
    ["-all", ""],
    ["+all", "spamoor"],
    ["-all", "spamoor"],
    ["+all,-spamoor", "spamoor"],
    ["+all,-buildoor", "spamoor"],
    ["-all,+spamoor", "spamoor"],
    ["-all,+buildoor", "spamoor"],
    ["+spamoor,-spamoor", "spamoor"],
    ["-spamoor,+spamoor", "spamoor"],
    ["-spamoor,+all", "spamoor"],
    ["+buildoor,-monitoring", "spamoor"],
    ["+ALL,-Spamoor", "spamoor"],
    ["+all,-spamoor", "SPAMOOR"],
    [" +all , -spamoor ", "spamoor"],
    ["all,-spamoor", "spamoor"],
    ["+,-spamoor", "spamoor"],
    ["+", "spamoor"],
    ["-all", "buildoor"],
    ["-all,+spamoor,+buildoor,-buildoor", "buildoor"],
    ["-all,+spamoor,+buildoor,-buildoor", "spamoor"],
    ["-all,+spamoor", "   "],
    ["-all,+spamoor", " spamoor "],
    ["-all", "all"],
    ["+all,-all", "all"],
    ["-spamoor", "all"],
    [" ", "spamoor"],
    [",,,", "spamoor"],
    ];

    let fragments = [
      "+all", "-all", "+ALL", "-All", "+spamoor", "-spamoor", "+Spamoor", "-SPAMOOR",
      "+buildoor", "-buildoor", "+dora", "-dora", "+my-service", "-x",
      " +spamoor ", " - spamoor", "+ all", "-\tall", "", " ", "+", "-", "all", "spamoor",
      "*", "+*", "-*", "++spamoor", "--all", "+-spamoor", "+spamoor+buildoor", "+spamoor buildoor",
    ];
    let services = ["spamoor", "SPAMOOR", " spamoor ", "buildoor", "dora", "my-service", "other", "all", "x", "*", ""];

    let rng = newRng(20261114);
    for(let i = 0; i < 20000; i++) {
      let n = rng(7);
      let parts: string[] = [];
      for(let j = 0; j < n; j++)
        parts.push(fragments[rng(fragments.length)]);
      queries.push([parts.join(","), services[rng(services.length)]]);
    }

    let allowed = 0, denied = 0;
    queries.forEach(([directives, service]) => {
      expect(directives.indexOf(":")).to.equal(-1, "test bug: not a legacy directive list");
      let want = legacyServiceAllowed(directives, service);
      if(want) allowed++; else denied++;
      if(serviceAllowed(directives, service) !== want)
        expect.fail("serviceAllowed(" + JSON.stringify(directives) + ", " + JSON.stringify(service) + ") = " + !want + ", v0.0.3 says " + want);
    });
    expect(allowed > 0 && denied > 0).to.equal(true, "the generator is one-sided");
  });

  // Over generated directive lists in the full grammar: a feature is never
  // allowed without base access in either mode, default-deny never allows
  // what default-allow refuses, and an empty feature is the base question.
  // The empty claim is one of the lists: it obeys the same formula, and
  // default-deny allows nothing under it.
  it("featureAllowed: never without base access (Go: TestFeatureAllowed_NeverWithoutBaseAccess)", () => {
    let fragments = [
      "+all", "-all", "+spamoor", "-spamoor", "+buildoor", "-buildoor",
      "+all:all", "+all:f1", "+all:-f1", "+all:all:-f2", "-all:f1", "-all:all",
      "+spamoor:all", "+spamoor:f1", "+spamoor:f1:f2", "+spamoor:-f1", "+spamoor:all:-f1",
      "-spamoor:f1", "-spamoor:all", "-spamoor:-f1", "+spamoor:", "-spamoor:", "+buildoor:f2",
      "+spamoor:basic", "-spamoor:basic", "+spamoor:-basic", "+spamoor:all:-basic", "-all:basic",
      "+all:basic:f1", "-spamoor:f1:basic", "-buildoor:-basic",
      "+spamoor:f*", "-spamoor:f*", "+all:all:-f*", "+spamoor:*", "-all:*", "+spamoor:f*1", "-spamoor:b*",
      "nonsense", "",
    ];
    let rng = newRng(7);
    let allowedDeny = 0, allowedAllow = 0, refusedForBase = 0;
    for(let i = 0; i < 20000; i++) {
      let n = 1 + rng(6);
      let parts: string[] = [];
      for(let j = 0; j < n; j++)
        parts.push(fragments[rng(fragments.length)]);
      let directives = parts.join(",");
      for(let service of ["spamoor", "buildoor", "other"]) {
        let base = serviceAllowed(directives, service);
        if(featureAllowed(directives, service, "", false) !== base)
          expect.fail(JSON.stringify(directives) + ": empty feature on " + service + " differs from base access " + base);
        for(let def of [false, true]) {
          if(featureAllowed(directives, service, FEATURE_BASIC, def) !== base)
            expect.fail(JSON.stringify(directives) + ": basic on " + service + " (defaultAllow " + def + ") differs from serviceAllowed " + base);
        }
        for(let feature of ["f1", "f2", "f3"]) {
          let deny = featureAllowed(directives, service, feature, false);
          let allow = featureAllowed(directives, service, feature, true);
          if((deny || allow) && !base)
            expect.fail(JSON.stringify(directives) + " allows " + service + ":" + feature + " without base access");
          if(deny && !allow)
            expect.fail(JSON.stringify(directives) + ": " + service + ":" + feature + " allowed under default-deny but not under default-allow");
          // No directive at all — the empty claim, or only separators:
          // basic access, the feature unset.
          if(directives.replace(/,/g, "") === "" && (deny || !allow))
            expect.fail(JSON.stringify(directives) + ": " + service + ":" + feature + " deny=" + deny + " allow=" + allow + ", want basic access and nothing more");
          if(deny) allowedDeny++;
          if(allow) allowedAllow++;
          if(!base) refusedForBase++;
        }
      }
    }
    expect(allowedDeny === 0 || allowedAllow === allowedDeny || refusedForBase === 0).to.equal(false,
      "the generator is not exercising the cases: deny=" + allowedDeny + " allow=" + allowedAllow + " noBase=" + refusedForBase);
  });

  // Asking for the feature "basic" is asking serviceAllowed, in both modes.
  it("featureAllowed: basic is serviceAllowed (Go: TestFeatureAllowed_BasicIsServiceAllowed)", () => {
    let signs = ["+", "-", "+", "-", "", " + ", "++"];
    let names = ["spamoor", "buildoor", "dora", "all", "ALL", " Spamoor ", "", "basic"];
    let segments = [
      "", "", "", ":basic", ":-basic", ":all", ":-all", ":f1", ":-f1", ":f1:f2", ":all:-f1", ":-f1:all",
      ":basic:f1", ":f1:basic", ":all:-basic", ":-basic:f1", ":", "::f1", ":-", ": Basic ", ":BASIC",
      ":b*", ":-b*", ":basic*", ":-basi*", ":*", ":-*", ":f*", ":us*er", ":*x", ":all:-b*",
    ];
    let services = ["spamoor", "buildoor", "dora", "unmentioned", "all", "basic", " SPAMOOR "];

    let rng = newRng(11);
    let directiveLists = ["", "+spamoor,+buildoor", "-all", "+all"];
    for(let i = 0; i < 30000; i++) {
      let n = rng(6);
      let parts: string[] = [];
      for(let j = 0; j < n; j++)
        parts.push(signs[rng(signs.length)] + names[rng(names.length)] + segments[rng(segments.length)]);
      directiveLists.push(parts.join(","));
    }

    let allowed = 0, denied = 0;
    for(let directives of directiveLists) {
      for(let service of services) {
        let want = serviceAllowed(directives, service);
        if(want) allowed++; else denied++;
        for(let def of [false, true]) {
          if(featureAllowed(directives, service, FEATURE_BASIC, def) !== want)
            expect.fail("featureAllowed(" + JSON.stringify(directives) + ", " + JSON.stringify(service) + ", basic, defaultAllow " + def + ") differs from serviceAllowed " + want);
        }
      }
    }
    expect(allowed > 0 && denied > 0).to.equal(true, "the generator is one-sided");
  });

  // Structurally hostile claims: nothing may throw or take long.
  it("odd input terminates (Go: TestDirectives_OddInputTerminates)", function() {
    this.timeout(30000);
    let inputs = [
      ",".repeat(100000),
      ":".repeat(100000),
      "+".repeat(100000),
      "-all,".repeat(50000),
      "+spamoor" + ":x".repeat(50000),
      "+spamoor:" + "*".repeat(50000),
      "+spamoor:" + "a*".repeat(20000),
      "+" + "a".repeat(100000) + ":" + "b".repeat(100000),
      "+all:all:-all,".repeat(20000),
      "+spamoor:\xff\xfe,-\x00:\x00,+\u212a:\u212a*",
      "+spamoor:-:-:-,-spamoor:basic:basic:,+:,-:,+*:*,-*",
      " \t\n,\t :\n ",
    ];
    let start = Date.now();
    for(let input of inputs) {
      for(let service of ["spamoor", "x", "all", "*", ""]) {
        serviceAllowed(input, service);
        for(let feature of ["x", "basic", "all", "a", ""]) {
          featureAllowed(input, service, feature, false);
          featureAllowed(input, service, feature, true);
        }
      }
    }
    expect(Date.now() - start).to.be.lessThan(20000, "odd inputs took too long");
  });

  // Not in the Go tests: where JavaScript's string functions differ from the
  // Go ones the reference uses, the port follows Go.
  it("whitespace and case follow Go's strings.TrimSpace / strings.ToLower", () => {
    // U+0085 is space for Go but not for String.prototype.trim
    checkFeature("-all,\u0085+spamoor:\u0085f1\u0085", "\u0085spamoor", "f1\u0085", true, true);
    // U+FEFF is not space for Go: the directive has no +/- prefix and is skipped
    expect(serviceAllowed("-all,\ufeff+spamoor", "spamoor")).to.equal(false);
    // the Kelvin sign lowercases to "k"
    checkFeature("-all,+spamoor:\u212a1", "spamoor", "k1", true, true);
    // U+0130 lowercases to a plain "i", not to "i" + U+0307
    checkFeature("-all,+spamoor:\u0130x", "spamoor", "ix", true, true);
    // a capital sigma lowercases to "σ" at the end of a word too
    checkFeature("-all,+spamoor:A\u03a3", "spamoor", "a\u03c3", true, true);
  });
});
