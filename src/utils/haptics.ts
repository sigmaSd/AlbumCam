// Haptic service disabled - no-op implementation
export class HapticService {
  private static isEnabled = false;

  static setEnabled(_enabled: boolean): void {
    // No-op
  }

  static getEnabled(): boolean {
    return false;
  }

  static async light(): Promise<void> {
    // No-op
  }

  static async medium(): Promise<void> {
    // No-op
  }

  static async heavy(): Promise<void> {
    // No-op
  }

  static async success(): Promise<void> {
    // No-op
  }

  static async warning(): Promise<void> {
    // No-op
  }

  static async error(): Promise<void> {
    // No-op
  }

  static tap(): Promise<void> {
    return Promise.resolve();
  }

  static buttonPress(): Promise<void> {
    return Promise.resolve();
  }

  static albumSwitch(): Promise<void> {
    return Promise.resolve();
  }

  static albumDelete(): Promise<void> {
    return Promise.resolve();
  }

  static photoCapture(): Promise<void> {
    return Promise.resolve();
  }

  static saveSuccess(): Promise<void> {
    return Promise.resolve();
  }

  static saveError(): Promise<void> {
    return Promise.resolve();
  }
}
