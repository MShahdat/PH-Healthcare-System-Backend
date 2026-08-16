import { Role } from "../../../generated/prisma/enums";
import config from "../config/env";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

export const seedSuperAdmin = async () => {
	try {
		const existSuperAdmin = await prisma.user.findFirst({
			where: { role: "SUPER_ADMIN" },
		});

		if (existSuperAdmin) {
			console.log("super admin already exists");
			return;
		}

		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		if (!name || !email || !password) {
			throw new Error("no super admin name, email, password");
		}

		const hasPass = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const superAdmi = await prisma.user.create({
			data: {
				name,
				email,
				password: hasPass,
				emailVerified: true,
				needPasswordChange: false,
				role: Role.SUPER_ADMIN,
			},
		});

		console.log("super admin created", superAdmi);
	} catch (error) {
		console.log("error", error);
		await prisma.user.delete({
			where: { email: config.super_admin_email },
		});
	}
};

export const seedTesterAdmin = async () => {
	try {
		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			throw new Error("no tester admin name, email, password");
		}

		const existTesterAdmin = await prisma.user.findUnique({
			where: { email },
		});

		if (existTesterAdmin) {
			console.log("tester admin already exists");
			return;
		}

		const hasPass = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hasPass,
				emailVerified: true,
				needPasswordChange: false,
				role: Role.ADMIN,
			},
		});

		console.log("tester admin created", testerAdmin);
	} catch (error) {
		console.log("error", error);
		await prisma.user.delete({
			where: { email: config.tester_admin_email },
		});
	}
};

export const seedTesterDoctor = async () => {
	try {
		const name = config.tester_doctor_name;
		const email = config.tester_doctor_email;
		const password = config.tester_doctor_password;

		if (!name || !email || !password) {
			throw new Error("no tester doctor name, email, password");
		}

		const existTesterDoctor = await prisma.user.findUnique({
			where: { email },
		});

		if (existTesterDoctor) {
			console.log("tester doctor already exists");
			return;
		}

		const hasPass = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerDoctor = await prisma.user.create({
			data: {
				name,
				email,
				password: hasPass,
				emailVerified: true,
				needPasswordChange: false,
				role: Role.DOCTOR,
			},
		});

		console.log("tester doctor created", testerDoctor);
	} catch (error) {
		console.log("error", error);
		await prisma.user.delete({
			where: { email: config.tester_doctor_email },
		});
	}
};
