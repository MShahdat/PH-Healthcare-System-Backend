import { UploadApiResponse } from "cloudinary";
import { prisma } from "../../lib/prisma"
import { Cloudinary } from "../../lib/cloudinary";
import { Role } from "../../../../generated/prisma/enums";
import bcrypt from "bcryptjs";
import config from "../../config/env";




//& APPLY DOCTOR
const applyDoctor = async (
  payload: any, 
  resume: Express.Multer.File, 
  additionalFiles: Express.Multer.File[]) => {

    console.log('payload ', payload)

    const isUser = await prisma.user.findUnique({
      where: {
        email: payload.user.email
      }
    })

    if(isUser){
      throw new Error("user already exists")
    }

    const resumeRes = await new Promise<UploadApiResponse>(
        (resolve, reject) => {
          Cloudinary.cloudinary.uploader
            .upload_stream(
              {
                folder: "resume",
                resource_type: "auto",
              },
              async (error, result) => {
                if (error) {
                  return reject(error);
                }
                if (!result) {
                  return reject(new Error("No result returned from cloudinary"));
                }
                return resolve(result);
              },
            )
            .end(resume?.buffer);
        },
      );

    const additionalFilesRes = await Promise.all(
      additionalFiles.map((file) => {
        return new Promise<UploadApiResponse>(
        (resolve, reject) => {
          Cloudinary.cloudinary.uploader
            .upload_stream(
              {
                folder: "additionalFiles",
                resource_type: "auto",
              },
              async (error, result) => {
                if (error) {
                  return reject(error);
                }
                if (!result) {
                  return reject(new Error("No result returned from cloudinary"));
                }
                return resolve(result);
              },
            )
            .end(file?.buffer);
        },
      );
      })
    )


    const randomPass = Math.random().toString(36).slice(-8);
    console.log('random pass', randomPass)

    const hashPass = await bcrypt.hash(randomPass, Number(config.bcrypt_salt_rounds))

    const doctorApply = await prisma.user.create({
      data: {
        ...payload.user,
        needPasswordChange: true,
        role: Role.DOCTOR,
        password: hashPass,
        
        doctor: {
          create: {
            name: payload.user.name,
            email: payload.user.email,
            ...payload.doctor,
            resume: resumeRes.secure_url,
            resumePublicId: resumeRes.public_id,
            additionalFiles: additionalFilesRes.map((file) => (
              {
                url: file.secure_url,
                publicId: file.public_id
            }))
          }
        }
      },
      omit: {
        password: true
      },
      include: {
        doctor: true
      }
    })

    return doctorApply
}




export const doctorService = {
  applyDoctor,

}