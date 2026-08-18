import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { appointmentService } from "./appointment.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from 'http-status'


//& BOOK APPOINTMENT
const bookAppointment = catchAsync(
  async(req: Request, res: Response) => {
    const result = await appointmentService.bookAppointment();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `payment created successfully`,
      data: result,
    });
  }
)


//& BOOK APPOINTMENT CALLBACK
const bookAppointmentCallback = catchAsync(
  async(req: Request, res: Response) => {

    const query = req.query
    const {result, redirectUrl} = await appointmentService.bookAppointmentCallback(query)

    res.redirect(redirectUrl)

    console.log("payment result = ", result)
  }
)


export const appointmentController = {
  bookAppointment,
  bookAppointmentCallback

}