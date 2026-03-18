import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
    role: z.enum(["USER", "SERVICE_PROVIDER"]).optional()
});

export const loginSchema = z.object({
    email: z.email("Please enter a valid email."),
    password: z.string().min(8,"Password must be atleast 8 characters long.")
});