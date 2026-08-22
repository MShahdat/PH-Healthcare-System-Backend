import { Router } from "express";
import { doctorController } from "./doctor.controller";
import { Cloudinary } from "../../lib/cloudinary";



const router = Router()

router.post('/apply-doctor',
  Cloudinary.upload.fields([
    {
      name: "resume",
      maxCount: 1
    },
    {
      name: "additionalFiles",
      maxCount: 6
    }
  ]),
  doctorController.applyDoctor)



export const doctorRouter = router