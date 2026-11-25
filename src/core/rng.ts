/** 시드 기반 난수 (mulberry32). 같은 시드면 같은 결과 → 버그 재현·밸런스 테스트용 */
export class Rng {
  private s: number;
  constructor(seed: number = Date.now()) {
    this.s = seed >>> 0;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** [min, max] 정수 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  /** pct: 0~100 */
  chance(pct: number): boolean {
    return this.next() * 100 < pct;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  weighted<T>(items: readonly T[], weight: (x: T) => number): T {
    const total = items.reduce((s, x) => s + weight(x), 0);
    let r = this.next() * total;
    for (const x of items) {
      r -= weight(x);
      if (r <= 0) return x;
    }
    return items[items.length - 1];
  }
}
