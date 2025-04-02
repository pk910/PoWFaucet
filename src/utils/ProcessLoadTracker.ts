export interface IProcessLoadStats {
  timestamp: number;
  cpu: number;
  eventLoopLag: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
  };
}

export class ProcessLoadTracker {
  private lastCpuUsage: NodeJS.CpuUsage = { user: 0, system: 0 };
  private lastCheckTime: number = 0;
  private eventLoopLag: number = 0;
  private loadCheckInterval: NodeJS.Timeout;
  private callback: (stats: IProcessLoadStats) => void;

  public static formatLoadStats(source: string, stats: IProcessLoadStats, additionalProps?: {[key: string]: any}): string {
    const formatBytes = (bytes: number) => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    const paddedSource = source.padEnd(50);
    const parts = [
      `${paddedSource} Stats:`,
      `CPU: ${(stats.cpu.toFixed(2)+"%,").padEnd(7)}`,
      `Memory: ${(formatBytes(stats.memory.heapUsed)+"/"+formatBytes(stats.memory.heapTotal)+",").padEnd(20)}`,
      `Event Loop Lag: ${(stats.eventLoopLag.toFixed(2)+"ms,").padStart(8)}`
    ];

    if (additionalProps && Object.keys(additionalProps).length > 0) {
      Object.entries(additionalProps).forEach(([key, value]) => {
        parts.push(`${key}: ${String(value+",").padEnd(6)}`);
      });
    }

    let line = parts.join(" ");
    return line.replace(/[, ]+$/, "");
  }

  public constructor(callback: (stats: IProcessLoadStats) => void, interval: number = 60000) {
    this.callback = callback;
    this.lastCpuUsage = process.cpuUsage();
    this.lastCheckTime = Date.now();
    this.startLoadTracking(interval);
  }

  private startLoadTracking(interval: number) {
    // Align with wallclock time (every minute at :00 seconds)
    const now = new Date();
    const delay = interval - (now.getTime() % interval);
    
    setTimeout(() => {
      this.collectAndSendStats();
      // Then run every interval
      this.loadCheckInterval = setInterval(() => this.collectAndSendStats(), interval);
    }, delay);
  }

  private collectAndSendStats() {
    const timestamp = Math.floor(Date.now() / 1000);
    const currentCpuUsage = process.cpuUsage();
    const currentTime = Date.now();
    const memoryUsage = process.memoryUsage();
    
    // Calculate CPU usage percentage
    const totalCpuTime = (currentCpuUsage.user - this.lastCpuUsage.user) + 
                        (currentCpuUsage.system - this.lastCpuUsage.system);
    const elapsedTime = (currentTime - this.lastCheckTime) * 1000;
    const cpuUsage = ((totalCpuTime / elapsedTime) * 100).toFixed(2);
    
    // Measure event loop lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const end = process.hrtime.bigint();
      this.eventLoopLag = Number(end - start) / 1_000_000;
      
      // Send all stats together
      this.callback({
        timestamp,
        cpu: parseFloat(cpuUsage),
        eventLoopLag: this.eventLoopLag,
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
        },
      });
    });
    
    this.lastCpuUsage = currentCpuUsage;
    this.lastCheckTime = currentTime;
  }

  public stop() {
    if (this.loadCheckInterval) {
      clearInterval(this.loadCheckInterval);
    }
  }
} 