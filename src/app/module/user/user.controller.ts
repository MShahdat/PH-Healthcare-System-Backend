import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { userService } from "./user.service";
import httpStatus from 'http-status'

//& PROFILE IMAGE UPLOAD 
const profileImageUpload = catchAsync(async(req: Request, res: Response) => {
  // console.log('request file ', req.file)
  
  if(!req.file){
    throw new Error('No file uploaded')
  }

  const userId = req.user?.userId as string;
  const result = await userService.profileImageUpload(req.file.buffer, userId)

  if(!result){
    return res.status(httpStatus.NOT_FOUND).json({
    success: true,
    httpCode: httpStatus.NOT_FOUND,
    message: 'user not found',
    data: null
  })
  }

  return res.status(httpStatus.OK).json({
    success: true,
    httpCode: httpStatus.OK,
    message: 'profile image uploaded successfully',
    data: result
  })
  

})



export const userController = {
  profileImageUpload,

}