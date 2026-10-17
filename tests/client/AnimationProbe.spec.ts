import 'mocha';
import { expect } from 'chai';
import { decideAnimation, median, AnimationProbe, IProbeWindow } from '../../faucet-client/src/pow/AnimationProbe.js';

describe("Progress animation probe", () => {
  it("median", () => {
    expect(median([])).to.equal(0);
    expect(median([5])).to.equal(5);
    expect(median([3, 1, 2])).to.equal(2);
    expect(median([4, 1, 3, 2])).to.equal(2.5);
  });

  describe("decideAnimation", () => {
    let window = (animated: boolean, ...hashrates: number[]): IProbeWindow => ({ animated, hashrates });

    it("pauses when the animation costs more than the threshold", () => {
      expect(decideAnimation([
        window(true, 90, 91, 89), window(false, 100, 101, 99), window(true, 90, 92, 88), window(false, 100, 100, 102),
      ], 0.07)).to.equal("pause");
    });

    it("keeps the animation when the loss is within the threshold", () => {
      expect(decideAnimation([
        window(true, 96, 95, 97), window(false, 100, 101, 99), window(true, 97, 96, 95), window(false, 100, 100, 102),
      ], 0.07)).to.equal("keep");
    });

    it("keeps the animation when it is faster with it, however odd", () => {
      expect(decideAnimation([
        window(true, 110, 112), window(false, 100, 101), window(true, 111, 109), window(false, 99, 100),
      ], 0.07)).to.equal("keep");
    });

    it("ignores a spike in one window", () => {
      expect(decideAnimation([
        window(true, 97, 96, 95), window(false, 100, 1000, 99), window(true, 97, 96, 95), window(false, 100, 100, 102),
      ], 0.07)).to.equal("keep");
    });

    it("stays undecided without two windows of each kind", () => {
      expect(decideAnimation([window(true, 90, 90), window(false, 100, 100)], 0.07)).to.equal("undecided");
      expect(decideAnimation([window(true, 90, 90), window(false, 100, 100), window(true, 90, 90)], 0.07)).to.equal("undecided");
    });

    it("stays undecided when a window has fewer than two samples", () => {
      expect(decideAnimation([
        window(true, 90), window(false, 100, 100), window(true, 90, 90), window(false, 100, 100),
      ], 0.07)).to.equal("undecided");
    });

    it("stays undecided without a hashrate", () => {
      expect(decideAnimation([
        window(true, 0, 0), window(false, 0, 0), window(true, 0, 0), window(false, 0, 0),
      ], 0.07)).to.equal("undecided");
    });
  });

  describe("AnimationProbe", () => {
    it("runs its schedule, samples only inside windows and reports the verdict", async () => {
      let switches: boolean[] = [];
      let verdict: string = null;
      let probe = new AnimationProbe(
        { warmupMs: 20, windowMs: 30, windows: [true, false, true, false], threshold: 0.07 },
        (animated) => switches.push(animated),
        (result) => { verdict = result; }
      );
      probe.start();
      probe.sample(50); // before the first window: ignored
      let feed = setInterval(() => probe.sample(switches[switches.length - 1] ? 90 : 100), 5);
      await new Promise((resolve) => setTimeout(resolve, 20 + 4 * 30 + 30));
      clearInterval(feed);
      expect(verdict).to.equal("pause");
      expect(switches).to.deep.equal([true, false, true, false, true], "the windows in order, then the animation back on");
    });

    it("cancel ends it and restores the animation", async () => {
      let switches: boolean[] = [];
      let verdict: string = null;
      let probe = new AnimationProbe(
        { warmupMs: 10, windowMs: 1000, windows: [true, false], threshold: 0.07 },
        (animated) => switches.push(animated),
        (result) => { verdict = result; }
      );
      probe.start();
      await new Promise((resolve) => setTimeout(resolve, 30));
      probe.cancel();
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(verdict).to.equal(null, "no verdict after cancel");
      expect(switches[switches.length - 1]).to.equal(true, "the animation is back on");
    });
  });
});
