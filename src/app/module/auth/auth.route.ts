import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { Role } from "../../../../generated/prisma/enums";
import { zodValidation } from "../../middleware/zodValidation";
import {
	forgotPasswordZodSchema,
	loginZodSchema,
	PatientRegisterZodSchema,
	resetPasswordZodSchema,
	VerifyEmailZodSchema,
} from "./authValidation";

const router = Router();

router.post(
	"/register",
	zodValidation(PatientRegisterZodSchema),
	AuthController.registerPatient,
);
router.post(
	"/verify-email",
	zodValidation(VerifyEmailZodSchema),
	AuthController.verifyEmail,
);

router.post("/login", zodValidation(loginZodSchema), AuthController.loginUser);
router.get(
	"/me",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/google", AuthController.googleLogin);
router.post(
	"/forgot-password",
	zodValidation(forgotPasswordZodSchema),
	AuthController.forgotPassword,
);
router.post(
	"/reset-password",
	zodValidation(resetPasswordZodSchema),
	AuthController.resetPassword,
);

export const AuthRoutes = router;
