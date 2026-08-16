import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import z from "zod";

export const zodValidation = (zodSchema: z.ZodObject) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		const payload = zodSchema.safeParse(req.body);

		if (!payload.success) {
			console.log(payload.error.issues);
			throw new Error(payload.error.issues[0].message);
		}

		req.body = payload.data;
		next();
	});
};
