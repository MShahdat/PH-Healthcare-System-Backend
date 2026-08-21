import { Router } from "express";
import { appointmentController } from "./appointment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";

const route = Router();

route.post(
	"/book-appointment",
	auth(Role.PATIENT),
	appointmentController.bookAppointment,
);

route.post("/payment", auth(Role.PATIENT), appointmentController.createpayment);

route.post(
	"/cancel-appointment",
	auth(Role.PATIENT),
	appointmentController.cancelAppointment,
);

route.get(
	"/book-appointment/payment/callback",
	appointmentController.bookAppointmentCallback,
);

export const appointmentRouter = route;
