import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Resend } from "resend";
import { ENV, CONSTANTS } from "@/config/constant";

const resend = new Resend(ENV.email.resend);

export const auth = betterAuth({
  baseURL: ENV.auth.url,
  trustedOrigins: [
    ENV.auth.url,
    "https://video-templater.up.railway.app"
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }: { user: { email: string }; url: string }) {
      console.log(`📧 Attempting to send verification email to ${user.email}...`);
      try {
        const { data, error } = await resend.emails.send({
          from: `Video Engine <onboarding@resend.dev>`, 
          to: user.email,
          subject: `Verify your email - ${CONSTANTS.PRODUCTION_SUITE_NAME}`,
          text: `Click here to verify your account: ${url}`,
        });

        if (error) {
          console.error("❌ Resend error:", error);
        } else {
          console.log("✅ Verification email sent successfully:", data?.id);
        }
      } catch (err) {
        console.error("❌ Failed to send verification email:", err);
      }
    },
  },
  secret: ENV.auth.secret,
});
