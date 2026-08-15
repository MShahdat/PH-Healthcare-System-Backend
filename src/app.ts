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


// app.post('/zod', async (req: Request, res: Response, next: NextFunction) => {
// 	try {
// 		const User = z.object({
// 			name: z.string().toUpperCase(),
// 			email: z.email(),
// 			password: z.string().normalize()
// 		})

// 		const payload = req.body

// 		const result = User.parse(payload)

// 		console.log(result)
// 		res.status(200).json({
// 			success: true,
// 			data: result
// 		})

// 	} catch (error) {
// 		console.log(error)
// 		next(error)
// 	}
// });

app.use(globalErrorHandler);
app.use(notFound);

export default app;
