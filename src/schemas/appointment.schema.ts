import { z } from "zod";

export const createAppointmentSchema = z.object({
    slotId: z.string(),
});