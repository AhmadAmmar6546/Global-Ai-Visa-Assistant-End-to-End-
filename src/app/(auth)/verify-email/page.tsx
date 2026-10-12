import { VerifyEmail } from "./verify-email";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const params = await searchParams;
  return <VerifyEmail token={typeof params.token === "string" ? params.token : ""} />;
}
