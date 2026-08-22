import { z } from "zod";

export const applyDoctorZodSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.email("Invalid email address"),
  }),
  doctor: z.object({
    address: z.string().optional(),
    bio: z.string().optional(),
    specialization: z.string(),
    licenceNumber: z.string(),
    qualifications: z.string(),
    experienceYears: z.number().int().nonnegative().default(0),
    consultationFee: z.number().optional(),
  }),
});
