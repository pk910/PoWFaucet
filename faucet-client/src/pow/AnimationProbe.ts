/**
 * Does the progress animation cost this machine mining speed?
 *
 * The miners run one worker per hardware thread, so on a saturated machine every millisecond
 * the page spends on repainting the animation comes out of a worker. Whether that is the case
 * here can only be measured here: after the miners warmed up, the animation is switched off
 * and on in turns and the hashrate of each window is compared. Alternating cancels the drift
 * the machine has anyway (thermal throttling, other tabs), the median of a window ignores the
 * odd spike.
 */

export interface IProbeWindow {
  animated: boolean;
  hashrates: number[];
}

export type ProbeVerdict = "keep" | "pause" | "undecided";

export interface IProbeSchedule {
  /** ms to let the miners settle before the first window */
  warmupMs: number;
  /** length of one window */
  windowMs: number;
  /** the windows, in order; `true` is with animation */
  windows: boolean[];
  /** the relative hashrate loss with animation from which on it is paused */
  threshold: number;
}

export const DEFAULT_PROBE_SCHEDULE: IProbeSchedule = {
  warmupMs: 30000,
  windowMs: 8000,
  windows: [true, false, true, false],
  threshold: 0.07,
};

export function median(values: number[]): number {
  if(values.length === 0)
    return 0;
  let sorted = values.slice().sort((a, b) => a - b);
  let mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The verdict over the measured windows.
 *
 * "undecided" when there is not enough to compare: fewer than two windows of a kind, a window
 * with fewer than two samples, or no hashrate at all. Undecided keeps the animation: the probe
 * must never pause it on noise.
 */
export function decideAnimation(windows: IProbeWindow[], threshold: number): ProbeVerdict {
  let animated = windows.filter((window) => window.animated);
  let still = windows.filter((window) => !window.animated);
  if(animated.length < 2 || still.length < 2)
    return "undecided";
  if(windows.some((window) => window.hashrates.length < 2))
    return "undecided";
  let rateWith = median(animated.map((window) => median(window.hashrates)));
  let rateWithout = median(still.map((window) => median(window.hashrates)));
  if(rateWithout <= 0 || rateWith <= 0)
    return "undecided";
  return rateWith < rateWithout * (1 - threshold) ? "pause" : "keep";
}

/**
 * Runs the schedule against a live miner.
 *
 * `setAnimated` switches the animation for a window, `onVerdict` gets the result once; `sample`
 * is fed every hashrate the miner reports. `cancel` stops it at any point and restores the
 * animation. The timers are the caller's: `setTimer`/`clearTimer` default to the window's.
 */
export class AnimationProbe {
  private schedule: IProbeSchedule;
  private setAnimated: (animated: boolean) => void;
  private onVerdict: (verdict: ProbeVerdict, windows: IProbeWindow[]) => void;
  private windows: IProbeWindow[] = [];
  private current: IProbeWindow | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private done = false;

  public constructor(schedule: IProbeSchedule, setAnimated: (animated: boolean) => void, onVerdict: (verdict: ProbeVerdict, windows: IProbeWindow[]) => void) {
    this.schedule = schedule;
    this.setAnimated = setAnimated;
    this.onVerdict = onVerdict;
  }

  public start(): void {
    this.timer = setTimeout(() => this.openWindow(0), this.schedule.warmupMs);
  }

  public sample(hashrate: number): void {
    if(this.current && hashrate > 0)
      this.current.hashrates.push(hashrate);
  }

  public cancel(): void {
    if(this.done)
      return;
    this.done = true;
    if(this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.current = null;
    this.setAnimated(true);
  }

  private openWindow(index: number): void {
    if(this.done)
      return;
    if(index >= this.schedule.windows.length) {
      this.finish();
      return;
    }
    let animated = this.schedule.windows[index];
    this.current = { animated: animated, hashrates: [] };
    this.windows.push(this.current);
    this.setAnimated(animated);
    this.timer = setTimeout(() => {
      this.current = null;
      this.openWindow(index + 1);
    }, this.schedule.windowMs);
  }

  private finish(): void {
    this.done = true;
    this.timer = null;
    let verdict = decideAnimation(this.windows, this.schedule.threshold);
    // the animation comes back for the verdict's taker to switch it off for good or not
    this.setAnimated(true);
    this.onVerdict(verdict, this.windows);
  }
}
