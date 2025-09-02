import { create } from 'zustand';

interface BookingModalState {
  isOpen: boolean;
  openBookingModal: () => void;
  closeBookingModal: () => void;
}

export const useBookingModal = create<BookingModalState>((set) => ({
  isOpen: false,
  openBookingModal: () => set({ isOpen: true }),
  closeBookingModal: () => set({ isOpen: false }),
}));