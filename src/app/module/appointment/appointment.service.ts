import config from "../../config/env"
import { getBkashIdToken } from "../../lib/bkash"



//& BOOK APPOINTMENT
const bookAppointment = async () => {

  const id_token = await getBkashIdToken()
  
  if (!id_token) {
    throw new Error('bkash id token failed')
  }

  console.log('id token service part', id_token)

  // will be business logic
  const createPayment = await fetch(`${config.bkash_base_url}/tokenized/checkout/create`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: id_token,
      "x-app-key": config.bkash_app_key
    },
    body: JSON.stringify({
      agreementID:'TokenizedMerchant01L3IKB6H1565072174986',
      mode: "0011",
      payerReference: "01723888888",
      callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
      merchantAssociationInfo: "MI05MID54RF09123456One",
      amount: "12",
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: "Inv1"
    })
  })

  const result = await createPayment.json()

  return result
}


//& BOOK APPOINTMENT CALLBACK
const bookAppointmentCallback = async (query: Record<string, any>) => {

  const id_token = await getBkashIdToken()
  
  if (!id_token) {
    throw new Error('bkash id token failed')
  }

  const paymentID = query.paymentID;
  const status = query.status;
  
  if(!paymentID){
    throw new Error('Payment id missing')
  }

  if(!status){
    throw new Error('status is missing')
  }

  const expecutePayment = await fetch(`${config.bkash_base_url}/tokenized/checkout/execute`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: id_token,
      "x-app-key": config.bkash_app_key
    },
    body: JSON.stringify({
      paymentID
    })
  })

  const result = await expecutePayment.json()

  if(status === 'success'){
    return {
      result,
      redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=success`
    }
  }
  if(status === 'failure'){
    return {
      result,
      redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=failure`
    }
  }
  if(status === 'cancel'){
    return {
      result,
      redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=cancel`
    }
  }
  return {
      result,
      redirectUrl: `${config.frontend_url}/dashboard/my-appointments`
    }

}


export const appointmentService = {
  bookAppointment,
  bookAppointmentCallback
}