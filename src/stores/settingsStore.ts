import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MobileLayout = "tabs" | "stacked";

interface SettingsState {
  /**
   * Mobile layout preference for match view
   * - "tabs": Show field OR bench (switchable tabs)
   * - "stacked": Show field above bench (both visible)
   */
  mobileLayout: MobileLayout;

  setMobileLayout: (layout: MobileLayout) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mobileLayout: "tabs",

      setMobileLayout: (layout) => set({ mobileLayout: layout }),
    }),
    {
      name: "subcoach-settings",
    },
  ),
);
