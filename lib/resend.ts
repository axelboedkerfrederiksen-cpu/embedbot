import { Resend } from "resend";

// Replace `re_xxxxxxxxx` with your real Resend API key.
const resendApiKey = process.env.RESEND_API_KEY || "re_xxxxxxxxx";

export const resend = new Resend(resendApiKey);
