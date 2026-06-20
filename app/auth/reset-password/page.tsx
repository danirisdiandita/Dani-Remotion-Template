import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage(props: { searchParams: Promise<{ token?: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard/projects");
  }

  const { token } = await props.searchParams;

  if (!token) {
    redirect("/auth/forgot-password");
  }

  return <ResetPasswordForm token={token} />;
}
