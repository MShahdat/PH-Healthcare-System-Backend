/*
  Warnings:

  - A unique constraint covering the columns `[merchantInvoiceNumber]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[PaymentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Made the column `merchantInvoiceNumber` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `PaymentId` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "merchantInvoiceNumber" SET NOT NULL,
ALTER COLUMN "PaymentId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_merchantInvoiceNumber_key" ON "Payment"("merchantInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_PaymentId_key" ON "Payment"("PaymentId");
