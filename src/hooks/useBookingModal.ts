import { create } from 'zustand';

interface BookingModalState {
  isOpen: boolean;
  initialStaffId?: string;
  initialDate?: string;
  initialTime?: string;
  openBookingModal: (prefill?: { staffId?: string; date?: string; time?: string }) => void;
  closeBookingModal: () => void;
}

export const useBookingModal = create<BookingModalState>((set) => ({
  isOpen: false,
  initialStaffId: undefined,
  initialDate: undefined,
  initialTime: undefined,
  openBookingModal: (prefill) =>
    set({
      isOpen: true,
      initialStaffId: prefill?.staffId,
      initialDate: prefill?.date,
      initialTime: prefill?.time,
    }),
  closeBookingModal: () =>
    set({
      isOpen: false,
      initialStaffId: undefined,
      initialDate: undefined,
      initialTime: undefined,
    }),
}));
