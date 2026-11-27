import { create } from "zustand";

/** Opens / closes the global search sheet (bottom nav, desktop header). */
export const useSearchSheet = create<{ open: boolean; setOpen: (o: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
