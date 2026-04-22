import { TestCase } from "./TestCase";
import { KadmiumApp } from "../../src/kadmium-app";

/**
 * Интеграционный тест с доступом к KadmiumApp и замером времени.
 * 
 * - Хранит ссылку на KadmiumApp
 * - Автоматически замеряет время run()
 * - Предоставляет measure() для замера отдельных участков
 */
export abstract class IntegrationTestCase extends TestCase {
  /** Время выполнения run() в миллисекундах */
  public elapsedMs: number = 0;

  private _measurements: { label: string; ms: number }[] = [];

  constructor(
    protected app: KadmiumApp,
    name: string,
  ) {
    super(name);
  }

  /**
   * Обёртка вокруг run() с автоматическим замером времени.
   * Не переопределять — вместо этого переопределять runImpl().
   */
  override async run(): Promise<void> {
    const start = performance.now();
    await this.runImpl();
    this.elapsedMs = Math.round(performance.now() - start);
  }

  /**
   * Основная логика теста. Переопределять вместо run().
   */
  protected abstract runImpl(): Promise<void>;

  /**
   * Замеряет время выполнения отдельного участка кода.
   */
  protected async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const ms = Math.round(performance.now() - start);
    this._measurements.push({ label, ms });
    return result;
  }

  /**
   * Логирует результат выполнения теста с таймингами.
   */
  public logResult(passed: boolean): void {
    const status = passed ? "PASSED" : "FAILED";
    const icon = passed ? "✓" : "✗";
    const timeStr = this.elapsedMs >= 1000
      ? `${(this.elapsedMs / 1000).toFixed(2)}s`
      : `${this.elapsedMs}ms`;

    if (this._measurements.length > 0) {
      console.log(`   ${icon} ${status}: ${this.name} [⏱ ${timeStr}]`);
      for (const m of this._measurements) {
        console.log(`      ↳ ${m.label}: ${m.ms}ms`);
      }
    } else {
      console.log(`   ${icon} ${status}: ${this.name} [⏱ ${timeStr}]`);
    }
  }
}
