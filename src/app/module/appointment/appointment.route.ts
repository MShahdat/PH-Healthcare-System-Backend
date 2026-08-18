import { Router } from "express";
import { appointmentController } from "./appointment.controller";



const route = Router()

route.post('/book-appointment', appointmentController.bookAppointment)

route.get('/book-appointment/payment/callback', appointmentController.bookAppointmentCallback)



export const appointmentRouter = route