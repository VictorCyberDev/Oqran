import "server-only";
import { db } from "@/lib/db";

export async function logActivity(params: {
  userId: string;
  action: string;
  description?: string;
  device?: string;
  ipAddress?: string;
}) {
  await db.activityLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      description: params.description,
      device: params.device,
      ipAddress: params.ipAddress,
    },
  });
}
