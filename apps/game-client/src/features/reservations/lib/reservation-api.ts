export interface ReservationRequest {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes?: string;
}

/**
 * Deliberate UI boundary until a reservation API is introduced. Keeping this
 * method isolated makes wiring a real endpoint a one-line replacement.
 */
export const reservationApi = {
  create: async (_request: ReservationRequest): Promise<{ confirmationId: string }> => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 700));
    return { confirmationId: `CTE-${String(Date.now()).slice(-6)}` };
  },
};
