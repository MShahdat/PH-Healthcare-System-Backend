import { Router } from "express";
import { userController } from "./user.controller";
import { Cloudinary } from "../../lib/cloudinary";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";



const route = Router()


route.patch('/profile-image',
  auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN), 
  Cloudinary.upload.single('profileImage'), 
  userController.profileImageUpload
)


export const userRouter = route