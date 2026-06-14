import { markWonderOrderPaid } from "@/lib/checkout";
import { sendPaidOrderEmailsForOrder } from "@/lib/order-email";
import {
  notifyAdminsOrderPaidForOrder,
  notifyCustomerOrderPaidForOrder,
} from "@/lib/push-notifications";
import { getWonderOrder, type WonderOrder } from "@/lib/wonder";

export async function completeWonderPayment(wonderOrder: WonderOrder) {
  const orderId = await markWonderOrderPaid(wonderOrder);

  if (!orderId) {
    return false;
  }

  const results = await Promise.allSettled([
    sendPaidOrderEmailsForOrder(orderId),
    notifyAdminsOrderPaidForOrder(orderId),
    notifyCustomerOrderPaidForOrder(orderId),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Wonder post-payment notification failed:", result.reason);
    }
  }

  return true;
}

export async function verifyAndCompleteWonderPayment(referenceNumber: string) {
  const wonderOrder = await getWonderOrder(referenceNumber);
  return completeWonderPayment(wonderOrder);
}
