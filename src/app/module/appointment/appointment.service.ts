import {
	AppointmentStatus,
	PaymentStatus,
} from "../../../../generated/prisma/enums";
import config from "../../config/env";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { IRequestUser } from "../auth/auth.interface";

//& BOOK APPOINTMENT
const bookAppointment = async (payload: any, user: IRequestUser) => {
	const transectionResult = await prisma.$transaction(
		async (tx) => {
			const id_token = await getBkashIdToken();

			if (!id_token) {
				throw new Error("bkash id token failed");
			}

			console.log("id token service part", id_token);

			//* appointment create
			const appointment = await tx.appointment.create({
				data: {
					status: AppointmentStatus.PENDING,
				},
			});

			//* create bkash payment url
			const createPayment = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/create`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						authorization: id_token,
						"x-app-key": config.bkash_app_key,
					},
					body: JSON.stringify({
						agreementID: "TokenizedMerchant01L3IKB6H1565072174986",
						mode: "0011",
						payerReference: user.email,
						callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
						merchantAssociationInfo: "MI05MID54RF09123456One",
						amount: "999",
						currency: "BDT",
						intent: "sale",
						merchantInvoiceNumber: appointment.id,
					}),
				},
			);

			const result = await createPayment.json();
			console.log("result ", result);

			//* create payment model
			await tx.payment.create({
				data: {
					appointmentId: appointment.id,
					amount: 999,
					PaymentId: result.paymentID,
					merchantInvoiceNumber: result.merchantInvoiceNumber,
					gatewayResponse: result,
					payerReference: user.email,
				},
			});

			return result;
		},
		{
			maxWait: 10000,
			timeout: 15000,
		},
	);
	return transectionResult;
};

//& CREATE PAYMENT
const createPayment = async (payload: any, user: IRequestUser) => {
	const { appointmentId } = payload;

	const appointment = await prisma.appointment.findUnique({
		where: { id: appointmentId },
	});

	if (!appointment) {
		throw new Error("appointment does not found");
	}

	if (appointment.status === AppointmentStatus.CONFIRMED) {
		throw new Error("you already completed payment");
	}

	if (appointment.status !== AppointmentStatus.PENDING) {
		throw new Error("appointment is not pending. You can't payment");
	}

	const id_token = await getBkashIdToken();

	if (!id_token) {
		throw new Error("bkash id token failed");
	}
	//* create bkash payment url
	const createPayment = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: id_token,
				"x-app-key": config.bkash_app_key,
			},
			body: JSON.stringify({
				agreementID: "TokenizedMerchant01L3IKB6H1565072174986",
				mode: "0011",
				payerReference: user.email,
				callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
				merchantAssociationInfo: "MI05MID54RF09123456One",
				amount: "999",
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: appointment.id,
			}),
		},
	);

	const result = await createPayment.json();
	console.log("result ", result);

	return result;
};

//& CANCEL APPOINTMENT
const cancelAppointment = async (payload: any, user: IRequestUser) => {
	const transectionResult = await prisma.$transaction(async (tx) => {
		const { appointmentId } = payload;
		const appointment = await tx.appointment.findUnique({
			where: { id: appointmentId },
		});

		if (!appointment) {
			throw new Error("appointment not found");
		}

		if (appointment.status === "CANCELLED") {
			throw new Error("appointment already cancelled");
		}
		if (
			appointment.status === "COMPLETED" ||
			appointment.status === "ONGOING"
		) {
			throw new Error("appointment already completed or ongoing");
		}

		if (appointment.status === "PENDING") {
			const update = await tx.appointment.update({
				where: { id: appointmentId },
				data: {
					status: "CANCELLED",
				},
			});

			const updatePay = await tx.payment.update({
				where: {
					appointmentId,
				},
				data: {
					status: "CANCELLED",
					reason: "Appointment will be cancelled",
				},
			});

			return {
				appointment: update,
				payment: updatePay,
			};
		}


    //* refunded bkash payment
		const payment = await tx.payment.findUnique({
			where: {
				appointmentId,
			},
		});

		if (!payment) {
			throw new Error("payment not  found");
		}

    console.log('payment from refund', payment)

		if (payment.status !== PaymentStatus.PAID || !payment.trxId) {
			throw new Error("only paid payments can be refunded");
		}

		const id_token = await getBkashIdToken();

		if (!id_token) {
			throw new Error("bkash id token failed");
		}

    console.log('token for refunded part', id_token)
    
		const createRefundPayment = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/payment/refund`,
			{
				method: "POST",
				headers: {
          "Content-Type": "application/json",
					Accept: "application/json",
					authorization: id_token,
					"x-app-key": config.bkash_app_key,
				},
				body: JSON.stringify({
					paymentID: payment.PaymentId,
					trxID: payment.trxId,
					amount: payment.amount.toString(),
					sku: `appointment-${appointmentId}`,
					reason: "Appointment will be cancelled",
				}),
			},
		);

		const refundedRes = await createRefundPayment.json();
    console.log('refunded res ', refundedRes)

		if (!createRefundPayment.ok || refundedRes.statusCode !== "0000") {
			throw new Error(
				refundedRes.statusMessage || "bKash refund request failed",
			);
		}

		const updateApp = await tx.appointment.update({
			where: { id: appointmentId },
			data: {
				status: "CANCELLED",
			},
		});

		const updatePay = await tx.payment.update({
			where: { appointmentId },
			data: {
				refundAmount: refundedRes.amount,
				refundedAt: refundedRes.completedTime,
				refundTrxId: refundedRes.refundTrxID,
				reason: "Appointment will be cancelled",
				gatewayResponse: refundedRes,
        status: "REFUNDED"
			},
		});

		return {
			updateApp,
			updatePay,
		};
	});

	return transectionResult;
};

//& BOOK APPOINTMENT CALLBACK
const bookAppointmentCallback = async (query: Record<string, any>) => {
	const transectionResult = await prisma.$transaction(
		async (tx) => {
			const id_token = await getBkashIdToken();

			if (!id_token) {
				throw new Error("bkash id token failed");
			}

			const paymentID = query.paymentID;
			const status = query.status;

			if (!paymentID) {
				throw new Error("Payment id missing");
			}

			if (!status) {
				throw new Error("status is missing");
			}

			const expecutePayment = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/execute`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						authorization: id_token,
						"x-app-key": config.bkash_app_key,
					},
					body: JSON.stringify({
						paymentID,
					}),
				},
			);

			const result = await expecutePayment.json();

			if (status === "success") {
				await tx.appointment.update({
					where: {
						id: result.merchantInvoiceNumber,
					},
					data: {
						status: AppointmentStatus.CONFIRMED,
					},
				});

				await tx.payment.update({
					where: { merchantInvoiceNumber: result.merchantInvoiceNumber },
					data: {
						paidAt: result.paymentExecuteTime,
						status: PaymentStatus.PAID,
						trxId: result.trxID,
						gatewayResponse: result,
						PaymentId: result.paymentID,
					},
				});
				return {
					result,
					redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=success`,
				};
			} else if (status === "failure") {
				await tx.payment.update({
					where: { merchantInvoiceNumber: result.merchantInvoiceNumber },
					data: {
						status: PaymentStatus.FAILED,
						gatewayResponse: result,
					},
				});
				return {
					result,
					redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=failure`,
				};
			} else if (status === "cancel") {
				await tx.payment.update({
					where: { merchantInvoiceNumber: result.merchantInvoiceNumber },
					data: {
						status: PaymentStatus.CANCELLED,
						gatewayResponse: result,
					},
				});
				return {
					result,
					redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=cancel`,
				};
			} else {
				throw new Error("bkash callback error!");
			}
		},
		{
			maxWait: 10000,
			timeout: 15000,
		},
	);
	return transectionResult;
};

export const appointmentService = {
	bookAppointment,
	createPayment,
	bookAppointmentCallback,
	cancelAppointment,
};
