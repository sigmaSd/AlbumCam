import * as Haptics from "expo-haptics";
import { HAPTIC_FEEDBACK, NOTIFICATION_FEEDBACK } from "../constants";

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

  static async tap(): Promise<void> {
    return this.light();
  }

  static async buttonPress(): Promise<void> {
    return this.light();
  }

  static async albumSwitch(): Promise<void> {
    return this.light();
  }

  static async albumDelete(): Promise<void> {
    return this.medium();
  }

  static async photoCapture(): Promise<void> {
    return this.medium();
  }

  static async saveSuccess(): Promise<void> {
    return this.success();
  }

  static async saveError(): Promise<void> {
    return this.error();
  }
}
