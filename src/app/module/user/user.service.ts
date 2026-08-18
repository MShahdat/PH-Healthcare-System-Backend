import { UploadApiResponse } from "cloudinary";
import { Cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";

//& PROFILE IMAGE UPLOAD
const profileImageUpload = async (buffer: Buffer, userId: string) => {
	const cloudinaryRes = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			Cloudinary.cloudinary.uploader
				.upload_stream(
					{
						folder: "profileImage",
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
				.end(buffer);
		},
	);

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			imagePublicId: true,
		},
	});

	const updateImage = await prisma.user.update({
		where: { id: userId },
		data: {
			imagePublicId: cloudinaryRes.public_id,
			imageURL: cloudinaryRes.secure_url,
		},
		omit: {
			password: true,
		},
	});

	if (user?.imagePublicId) {
		Cloudinary.cloudinary.uploader
			.destroy(user.imagePublicId, {
				invalidate: true,
			})
			.catch((error) => console.log(error));
	}
	return updateImage;
};

export const userService = {
	profileImageUpload,
};
