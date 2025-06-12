import * as Haptics from "expo-haptics";

export class HapticService {
  private static isEnabled = true;

  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  static getEnabled(): boolean {
    return this.isEnabled;
  }

  static async light(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async medium(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async heavy(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async success(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async warning(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async error(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static tap(): Promise<void> {
    return this.light();
  }

  static buttonPress(): Promise<void> {
    return this.light();
  }

  static albumSwitch(): Promise<void> {
    return this.light();
  }

  static albumDelete(): Promise<void> {
    return this.medium();
  }

  static photoCapture(): Promise<void> {
    return this.medium();
  }

  static saveSuccess(): Promise<void> {
    return this.success();
  }

  static saveError(): Promise<void> {
    return this.error();
  }
}
