/**
 * Simple profiler for identifying performance bottlenecks
 * Similar to a flamegraph but text-based
 */

interface ProfileEntry {
  name: string;
  startTime: number;
  endTime?: number;
  children: ProfileEntry[];
  parent?: ProfileEntry;
}

class SimpleProfiler {
  private stack: ProfileEntry[] = [];
  private root: ProfileEntry;

  constructor() {
    this.root = {
      name: 'ROOT',
      startTime: performance.now(),
      children: [],
    };
    this.stack.push(this.root);
  }

  start(name: string): void {
    const entry: ProfileEntry = {
      name,
      startTime: performance.now(),
      children: [],
      parent: this.stack[this.stack.length - 1],
    };

    this.stack[this.stack.length - 1].children.push(entry);
    this.stack.push(entry);
  }

  end(): void {
    if (this.stack.length <= 1) {
      console.warn('Profiler: No active profile to end');
      return;
    }

    const entry = this.stack.pop()!;
    entry.endTime = performance.now();
  }

  finish(): ProfileResult {
    // End any remaining entries
    while (this.stack.length > 1) {
      this.end();
    }

    this.root.endTime = performance.now();
    return new ProfileResult(this.root);
  }
}

class ProfileResult {
  constructor(private root: ProfileEntry) {}

  print(): void {
    console.log('\n=== PERFORMANCE PROFILE ===');
    this.printEntry(this.root, 0);
    console.log('=== END PROFILE ===\n');
  }

  private printEntry(entry: ProfileEntry, depth: number): void {
    const duration = (entry.endTime || performance.now()) - entry.startTime;
    const indent = '  '.repeat(depth);
    const percentage = entry.parent
      ? (
          (duration / ((entry.parent.endTime || performance.now()) - entry.parent.startTime)) *
          100
        ).toFixed(1)
      : 100;

    console.log(`${indent}${entry.name}: ${duration.toFixed(2)}ms (${percentage}%)`);

    // Sort children by duration (descending)
    const sortedChildren = [...entry.children].sort((a, b) => {
      const aDuration = (a.endTime || performance.now()) - a.startTime;
      const bDuration = (b.endTime || performance.now()) - b.startTime;
      return bDuration - aDuration;
    });

    for (const child of sortedChildren) {
      this.printEntry(child, depth + 1);
    }
  }

  getBottlenecks(
    minPercentage: number = 10
  ): Array<{ name: string; duration: number; percentage: number }> {
    const bottlenecks: Array<{ name: string; duration: number; percentage: number }> = [];
    const rootDuration = (this.root.endTime || performance.now()) - this.root.startTime;

    this.findBottlenecks(this.root, rootDuration, minPercentage, bottlenecks);

    return bottlenecks.sort((a, b) => b.duration - a.duration);
  }

  private findBottlenecks(
    entry: ProfileEntry,
    rootDuration: number,
    minPercentage: number,
    bottlenecks: Array<{ name: string; duration: number; percentage: number }>
  ): void {
    const duration = (entry.endTime || performance.now()) - entry.startTime;
    const percentage = (duration / rootDuration) * 100;

    if (percentage >= minPercentage) {
      bottlenecks.push({
        name: entry.name,
        duration,
        percentage,
      });
    }

    for (const child of entry.children) {
      this.findBottlenecks(child, rootDuration, minPercentage, bottlenecks);
    }
  }
}

// Global profiler instance
let globalProfiler: SimpleProfiler | null = null;

export function startProfiling(): void {
  globalProfiler = new SimpleProfiler();
}

export function profile<T>(name: string, fn: () => T): T {
  if (!globalProfiler) {
    return fn(); // No profiling active
  }

  globalProfiler.start(name);
  try {
    const result = fn();
    globalProfiler.end();
    return result;
  } catch (error) {
    globalProfiler.end();
    throw error;
  }
}

export function endProfiling(): ProfileResult | null {
  if (!globalProfiler) {
    return null;
  }

  const result = globalProfiler.finish();
  globalProfiler = null;
  return result;
}

// Convenience wrapper for async functions
export async function profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!globalProfiler) {
    return fn();
  }

  globalProfiler.start(name);
  try {
    const result = await fn();
    globalProfiler.end();
    return result;
  } catch (error) {
    globalProfiler.end();
    throw error;
  }
}
