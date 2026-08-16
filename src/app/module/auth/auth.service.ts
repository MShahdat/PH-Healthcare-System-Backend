import bcrypt from "bcryptjs";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import type {
	IForgotPasswordPayload,
	IGoogleLogin,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";
import { prisma } from "../../lib/prisma";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../../generated/prisma/enums";
import { jwtUtils } from "../../utils/jwt";
import config from "../../config/env";
import { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";
import { redisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodemailer";
import ejs from "ejs";
import path from "path";

//& STORE REDIS AND OTP SEND
const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, password } = payload;

	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(password, 8);

	const expirationTime = 5 * 60;
	const otp = crypto.randomInt(100000, 1000000);
	const otpKey = `patient-register-otp: ${email}`;

	await redisClient.set(otpKey, otp, {
		expiration: {
			type: "EX",
			value: expirationTime,
		},
	});

	const registerKey = `patient-register-data: ${email}`;
	const registerValue = {
		name,
		email,
		password: hashedPassword,
	};

	await redisClient.set(registerKey, JSON.stringify(registerValue), {
		expiration: {
			type: "EX",
			value: expirationTime,
		},
	});

	const templetePath = path.join(
		process.cwd(),
		"src/app/templete/verification-otp.ejs",
	);

	const templeteData = {
		name,
		otp,
		expire: expirationTime / 60,
	};

	const html = await ejs.renderFile(templetePath, templeteData);

	await transporter.sendMail({
		from: config.smtp_sender,
		to: email,
		subject: "Email Verification",
		// text: `your otp is ${otp}`
		// html: `<h1> your otp is ${otp} </h1>`
		html,
	});

	// const createdUser = await prisma.user.create({
	// 	data: {
	// 		name,
	// 		email,
	// 		password: hashedPassword,
	// 		role: Role.PATIENT,
	// 		status: UserStatus.ACTIVE,
	// 		emailVerified: false,
	// 		patient: {
	// 			create: { name, email },
	// 		},
	// 	},
	// 	omit: { password: true },
	// 	include: { patient: true },
	// });

	// const { patient, ...user } = createdUser;
	// const jwtPayload = {
	// 	userId: user.id,
	// 	name: user.name,
	// 	email: user.email,
	// 	role: user.role,
	// };

	// const accessToken = jwtUtils.createToken(
	// 	jwtPayload,
	// 	config.jwt_access_secret,
	// 	config.jwt_access_expires_in as SignOptions,
	// );

	// const refreshToken = jwtUtils.createToken(
	// 	jwtPayload,
	// 	config.jwt_refresh_secret,
	// 	config.jwt_refresh_expires_in as SignOptions,
	// );

	// return {
	// 	user,
	// 	patient,
	// 	accessToken,
	// 	refreshToken,
	// };
};

//& EMAIL VERIFY AND ACCOUNT CREATE
const verifyEmail = async (payload: IVerifyEmailPayload) => {
	const { email, otp } = payload;

	const registerKey = `patient-register-data: ${email}`;
	const redisData = await redisClient.get(registerKey);

	const otpKey = `patient-register-otp: ${email}`;
	const redisOTP = await redisClient.get(otpKey);

	if (!redisData || !redisOTP) {
		throw new Error("Invalid Data!");
	}

	const payloadData = JSON.parse(redisData) as IRegisterPatientPayload;

	if (payloadData.email !== email) {
		throw new Error("Invalid email");
	}

	if (redisOTP !== otp) {
		throw new Error("OTP does not match!");
	}

	const isPatient = await prisma.user.findUnique({
		where: { email },
	});

	if (isPatient) {
		throw new Error("Email alredy exist");
	}

	const patientCreated = await prisma.user.create({
		data: {
			name: payloadData.name,
			email: payloadData.email,
			password: payloadData.password,
			role: Role.PATIENT,
			emailVerified: true,
			status: "ACTIVE",
			patient: {
				create: {
					name: payloadData.name,
					email: payloadData.email,
				},
			},
		},
		omit: {
			password: true,
		},
		include: {
			patient: true,
		},
	});

	const templeteData = {
		name: payloadData.name,
	};

	const html = await ejs.renderFile(
		path.join(process.cwd(), "src/app/templete/patient-welcome.ejs"),
		templeteData,
	);

	await transporter.sendMail({
		from: config.smtp_sender,
		to: payloadData.email,
		subject: "Welcome to PH Healthcare System",
		html,
	});

	await redisClient.del([otpKey, registerKey]);

	const { patient, ...user } = patientCreated;

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user,
		patient,
		accessToken,
		refreshToken,
	};
};

//& LOGIN USER
const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (user.password === null && user.googleId !== null) {
		throw new Error(
			"User already has an account with google. please try to login with google",
		);
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

//& GET ME
const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			patient: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new Error("User not found");
	}

	return isUserExists;
};

//& CREATE ACCESS TOKEN
const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new Error(
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

//& GOOGLE LOGIN
const googleLogin = async (payload: IGoogleLogin) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;

	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_auth_client_id,
		});
		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
		console.log("google authentication failed", error);
		throw new Error("invalid or expired google id token");
	}

	if (!googleIdTokenPayload) {
		throw new Error("invalid or expired google id token");
	}

	if (!googleIdTokenPayload.email) {
		throw new Error("email not found");
	}

	if (!googleIdTokenPayload.name) {
		throw new Error("name not found");
	}

	const isExistWithGoogle = await prisma.user.findUnique({
		where: {
			email: googleIdTokenPayload.email,
			role: Role.PATIENT,
			googleId: googleIdTokenPayload.sub,
		},
	});

	let user = isExistWithGoogle;

	if (!isExistWithGoogle) {
		const isEmailExistWithCreadential = await prisma.user.findUnique({
			where: {
				email: googleIdTokenPayload.email,
				role: Role.PATIENT,
				authProvider: AuthProvider.CREADENTIAL,
			},
		});

		if (isEmailExistWithCreadential) {
			if (isEmailExistWithCreadential.status === "BLOCKED") {
				throw new Error("user is temporary blocked");
			}

			if (
				isEmailExistWithCreadential.isDeleted ||
				isEmailExistWithCreadential.status === "DELETED"
			) {
				throw new Error("user delted");
			}

			user = await prisma.user.update({
				where: {
					id: isEmailExistWithCreadential.id,
				},
				data: {
					googleId: googleIdTokenPayload.sub,
				},
			});
		} else {
			user = await prisma.user.create({
				data: {
					name: googleIdTokenPayload.name,
					email: googleIdTokenPayload.email,
					role: Role.PATIENT,
					googleId: googleIdTokenPayload.sub,
					authProvider: AuthProvider.GOOGLE,
					emailVerified: true,
					patient: {
						create: {
							name: googleIdTokenPayload.name,
							email: googleIdTokenPayload.email,
						},
					},
				},
			});

			const templeteData = {
				name: googleIdTokenPayload.name,
			};

			const html = await ejs.renderFile(
				path.join(process.cwd(), "src/app/templete/patient-welcome.ejs"),
				templeteData,
			);

			await transporter.sendMail({
				from: config.smtp_sender,
				to: googleIdTokenPayload.email,
				subject: "Welcome to PH Healthcare System",
				html,
			});
		}
	}

	if (!user) {
		throw new Error("user not found");
	}

	if (user.status === "BLOCKED") {
		throw new Error("user is temporary blocked");
	}

	if (user.isDeleted || user.status === "DELETED") {
		throw new Error("user delted");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);
	return {
		accessToken,
		refreshToken,
	};
};

//& FORGOT PASSWORD
const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const { email } = payload;

	const isExistUser = await prisma.user.findUnique({
		where: { email },
	});

	if (!isExistUser) {
		throw new Error("User does not exist");
	}

	if (isExistUser.status === "BLOCKED") {
		throw new Error("User thas temporary blocked");
	}

	if (isExistUser.status === UserStatus.DELETED) {
		throw new Error("user has deleted");
	}

	if (
		isExistUser.googleId &&
		isExistUser.authProvider === AuthProvider.GOOGLE
	) {
		throw new Error(`user can't forgot password`);
	}

	const otp = crypto.randomInt(100000, 1000000).toString();

	const expirationTime = 5 * 60;
	const key = `forgot-password-otp: ${isExistUser.email}`;
	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: expirationTime,
		},
	});

	const templetePath = path.join(
		process.cwd(),
		"src/app/templete/forgot-password.ejs",
	);

	const templeteData = {
		name: isExistUser.name,
		otp,
		expire: expirationTime / 60,
	};

	const html = await ejs.renderFile(templetePath, templeteData);

	await transporter.sendMail({
		from: config.smtp_sender,
		to: isExistUser.email,
		subject: "Forgot Password",
		// text: `your otp is ${otp}`
		// html: `<h1> your otp is ${otp} </h1>`
		html,
	});
};

//& RESET PASSWORD
const resetPassword = async (payload: IResetPasswordPayload) => {
	const { email, otp, newPassword } = payload;

	const isExistUser = await prisma.user.findUnique({
		where: { email },
	});

	if (!isExistUser) {
		throw new Error("User does not exist");
	}

	if (isExistUser.status === "BLOCKED") {
		throw new Error("User thas temporary blocked");
	}

	if (isExistUser.status === UserStatus.DELETED) {
		throw new Error("user has deleted");
	}

	if (
		isExistUser.googleId &&
		isExistUser.authProvider === AuthProvider.GOOGLE
	) {
		throw new Error(`user can't forgot password`);
	}

	const key = `forgot-password-otp: ${isExistUser.email}`;
	const redisOTP = await redisClient.get(key);

	if (!redisOTP) {
		throw new Error("Invalid OTP");
	}

	if (redisOTP !== otp) {
		throw new Error("OTP does not match");
	}

	const hashPass = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds),
	);

	await prisma.user.update({
		where: { email },
		data: {
			password: hashPass,
		},
	});

	const templeteData = {
		name: isExistUser.name,
	};

	const html = await ejs.renderFile(
		path.join(process.cwd(), "src/app/templete/reset-password.ejs"),
		templeteData,
	);

	await transporter.sendMail({
		from: config.smtp_sender,
		to: isExistUser.email,
		subject: "Reset Password",
		html,
	});

	await redisClient.del(key);
};

export const AuthService = {
	registerPatient,
	verifyEmail,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
};
