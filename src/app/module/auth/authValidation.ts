import z from "zod";

export const PatientRegisterZodSchema = z.object({
	name: z.string().min(3),
	email: z.email(),
	password: z
		.string()
		.min(8)
		.max(40)
		.regex(/[A-Z]/, {
			message: "Password must contain at least one uppercase letter.",
		})
		.regex(/[a-z]/, {
			message: "Password must contain at least one lowercase letter.",
		})
		.regex(/[0-9]/, { message: "Password must contain at least one number." })
		.regex(/[^A-Za-z0-9]/, {
			message: "Password must contain at least one special character.",
		}),
	patient: z
		.object({
			contactNumber: z.string().optional(),
			address: z.string().optional(),
		})
		.optional(),
});

export const VerifyEmailZodSchema = z.object({
	email: z.email(),
	otp: z.string().length(6),
});

export const loginZodSchema = z.object({
	email: z.email(),
	password: z
		.string()
		.min(8)
		.max(40)
		.regex(/[A-Z]/, {
			message: "Password must contain at least one uppercase letter.",
		})
		.regex(/[a-z]/, {
			message: "Password must contain at least one lowercase letter.",
		})
		.regex(/[0-9]/, { message: "Password must contain at least one number." })
		.regex(/[^A-Za-z0-9]/, {
			message: "Password must contain at least one special character.",
		}),
});

export const forgotPasswordZodSchema = z.object({
	email: z.email(),
});

export const resetPasswordZodSchema = z.object({
	email: z.email(),
	newPassword: z
		.string()
		.min(8)
		.max(40)
		.regex(/[A-Z]/, {
			message: "Password must contain at least one uppercase letter.",
		})
		.regex(/[a-z]/, {
			message: "Password must contain at least one lowercase letter.",
		})
		.regex(/[0-9]/, { message: "Password must contain at least one number." })
		.regex(/[^A-Za-z0-9]/, {
			message: "Password must contain at least one special character.",
		}),
	otp: z.string().length(6, { message: "OTP must be 6 digits long." }),
});
