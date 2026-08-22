import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import httpStatus from 'http-status'
import { sendResponse } from "../../utils/sendResponse";
import { doctorService } from "./doctor.service";
import { applyDoctorZodSchema } from "./doctor.validation";

//& APPLY AS A DOCTOR
const applyDoctor = catchAsync(
  async(req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const resume = files?.['resume']?.[0];
    const additionalFiles = files?.['additionalFiles'] || [];

    if(!req.body.data){
      throw new Error('form data not found')
    }
    let data = JSON.parse(req.body.data)

    const validation = applyDoctorZodSchema.safeParse(data)

    if(!validation.success){
      throw new Error(validation.error.issues[0].message)
    }

    data = validation.data

    const result = await doctorService.applyDoctor(data, resume!, additionalFiles)
    
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `doctor apply successfully`,
        data: result,
      });
  }
)



export const doctorController = {
  applyDoctor,

}