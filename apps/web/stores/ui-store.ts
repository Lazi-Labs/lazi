import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activePipelineId: string | null;
  hideUnbuiltFeatures: boolean;
  _hasHydrated: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setActivePipeline: (id: string | null) => void;
  setHideUnbuiltFeatures: (hide: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      activePipelineId: null,
      hideUnbuiltFeatures: false,
      _hasHydrated: false,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setActivePipeline: (id) => set({ activePipelineId: id }),
      setHideUnbuiltFeatures: (hide) => set({ hideUnbuiltFeatures: hide }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ hideUnbuiltFeatures: state.hideUnbuiltFeatures, sidebarCollapsed: state.sidebarCollapsed }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
