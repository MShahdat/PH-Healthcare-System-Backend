import express, {
	NextFunction,
	type Application,
	type Request,
	type Response,
} from "express";
import config from "./app/config/env";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import z, { success } from "zod";
import { redisClient } from "./app/lib/redis";
import crypto from "crypto";
import { userRouter } from "./app/module/user/user.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cookieParser());

app.get("/", async (req: Request, res: Response) => {
	res.status(200).json({
		success: true,
		message: "Welcome to PH Healthcase System Backend",
	});
});

app.use("/api/v1/auth", AuthRoutes);
app.use('/api/v1/user', userRouter)




//! testing purpose
app.get("/redis", async (req: Request, res: Response, next: NextFunction) => {
	try {
		const otp = crypto.randomInt(10000, 1000000);
		// await redisClient.set('forgot-password-otp:patient1@gmail.com', '123456', {
		// 	expiration: {
		// 		type: "EX",
		// 		value: 60
		// 	}
		// })
		// await redisClient.set('forgot-password-otp:patient2@gmail.com', '654321', {
		// 	expiration: {
		// 		type: "EX",
		// 		value: 60
		// 	}
		// })
		res.status(200).json({
			success: true,
			data: otp,
		});
	} catch (error) {
		console.log(error);
		next(error);
	}
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
