// While a payment request is in flight nothing else may happen (navigation, back, closing sheets).
import { create } from "zustand";

interface BlockState {
  blockers: number;
  push: () => void;
  pop: () => void;
}

export const usePaymentBlock = create<BlockState>((set) => ({
  blockers: 0,
  push: () => set((s) => ({ blockers: s.blockers + 1 })),
  pop: () => set((s) => ({ blockers: Math.max(0, s.blockers - 1) })),
}));

export const isPaymentBlocked = () => usePaymentBlock.getState().blockers > 0;
