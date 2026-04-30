import { getCustomerByNumber, createCustomer, updateCustomer } from "../db";

export async function ensureCustomerRecord(input: {
  clientNumber: string;
  clientName: string;
  zone: string;
  sourceChannel?: "facebook" | "tiktok" | "marketplace" | "referral" | "other";
}) {
  let customer = await getCustomerByNumber(input.clientNumber);

  if (!customer) {
    await createCustomer({
      clientNumber: input.clientNumber,
      name: input.clientName,
      zone: input.zone,
      sourceChannel: input.sourceChannel || "other",
    });
    customer = await getCustomerByNumber(input.clientNumber);
  } else {
    const updates: Record<string, string> = {};

    if (input.clientName.trim() && input.clientName !== customer.name) {
      updates.name = input.clientName;
    }

    if (input.zone.trim() && input.zone !== customer.zone) {
      updates.zone = input.zone;
    }
    
    if (input.sourceChannel && (!customer.sourceChannel || customer.sourceChannel === "other")) {
      (updates as any).sourceChannel = input.sourceChannel;
    }

    if (Object.keys(updates).length > 0) {
      await updateCustomer(customer.id, updates);
      customer = await getCustomerByNumber(input.clientNumber);
    }
  }

  return customer;
}
