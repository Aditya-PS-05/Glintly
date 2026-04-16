import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";

let _client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
    if (_client) return _client;
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
        throw new Error(
            "Razorpay credentials are not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET).",
        );
    }
    _client = new Razorpay({ key_id, key_secret });
    return _client;
}

export function verifyWebhookSignature(
    payload: string,
    signature: string,
): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
        throw new Error("RAZORPAY_WEBHOOK_SECRET not configured");
    }
    const expected = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, "hex"),
            Buffer.from(signature, "hex"),
        );
    } catch {
        return false;
    }
}

export const PLAN_ID_BY_TIER: Record<"PRO" | "TEAM", string | undefined> = {
    PRO: process.env.RAZORPAY_PRO_PLAN_ID,
    TEAM: process.env.RAZORPAY_TEAM_PLAN_ID,
};
