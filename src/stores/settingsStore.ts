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

  /**
   * Show fairness score during match
   */
  showFairnessScore: boolean;

  /**
   * Show substitution suggestions during match
   */
  showSubstitutionSuggestions: boolean;

  setMobileLayout: (layout: MobileLayout) => void;
  setShowFairnessScore: (show: boolean) => void;
  setShowSubstitutionSuggestions: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mobileLayout: "tabs",
      showFairnessScore: true,
      showSubstitutionSuggestions: true,

      setMobileLayout: (layout) => set({ mobileLayout: layout }),
      setShowFairnessScore: (show) => set({ showFairnessScore: show }),
      setShowSubstitutionSuggestions: (show) =>
        set({ showSubstitutionSuggestions: show }),
    }),
    {
      name: "subcoach-settings",
    },
  ),
);
