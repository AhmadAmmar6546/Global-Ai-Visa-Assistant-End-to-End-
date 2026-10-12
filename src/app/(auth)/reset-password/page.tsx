import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const params = await searchParams;
  return <ResetPasswordForm token={typeof params.token === "string" ? params.token : ""} />;
}
