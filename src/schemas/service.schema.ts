import { z } from "zod";

export const createServiceSchema = z.object({
    name: z.string(),
    type: z.enum(["MEDICAL", "HOUSE_HELP", "BEAUTY", "FITNESS", "EDUCATION", "OTHER"]),
    durationMinutes: z.number().min(30).max(120).refine(val=>val%30===0)
});


const timeRegex = /^([01]\d|2[0-3]):(00|30)$/;
export const createAvailabilitySchema=z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(timeRegex),
    endTime: z.string().regex(timeRegex)
});


export const getServiceSchema = z.object({
    type: z.enum(["MEDICAL", "HOUSE_HELP", "BEAUTY", "FITNESS", "EDUCATION", "OTHER"]).optional(),
});