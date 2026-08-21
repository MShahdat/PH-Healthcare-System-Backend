import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { appointmentService } from "./appointment.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

//& BOOK APPOINTMENT
const bookAppointment = catchAsync(async (req: Request, res: Response) => {
	const body = req.body;
	const user = req.user!;

	const result = await appointmentService.bookAppointment(body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `payment url created successfully`,
		data: result,
	});
});


//& PAYMENT CREATE
const createpayment = catchAsync(async (req: Request, res: Response) => {
	const body = req.body;
	const user = req.user!;

	const result = await appointmentService.createPayment(body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `payment url created successfully`,
		data: result,
	});
});


//& BOOK APPOINTMENT CALLBACK
const bookAppointmentCallback = catchAsync(
	async (req: Request, res: Response) => {
		const query = req.query;
		const { result, redirectUrl } =
			await appointmentService.bookAppointmentCallback(query);

		res.redirect(redirectUrl);

		console.log("payment result = ", result);
	},
);

export const appointmentController = {
	bookAppointment,
  createpayment,
	bookAppointmentCallback,
};
