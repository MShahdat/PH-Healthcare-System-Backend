import { Cloudinary } from "../../lib/cloudinary"
import { prisma } from "../../lib/prisma"


//& PROFILE IMAGE UPLOAD
const profileImageUpload = async(buffer: Buffer, userId: string) => {
  Cloudinary.cloudinary.uploader.upload_stream({
    resource_type: "auto"
  },
  async (error, result) => {
    if(error){
      console.log('error', error)
      throw new Error(error.message)
    }
    // console.log('result ', result)
    const updateImage = await prisma.user.update({
      where: {id: userId},
      data: {
        imagePublicId: result?.public_id,
        imageURL: result?.secure_url
      }
    })
    console.log("updated user", updateImage)
  }).end(buffer)


  const user = await prisma.user.findUnique({
    where: {id: userId},
    omit: {
      password: true
    }
  })

  return user
}



export const userService = {
  profileImageUpload,

}