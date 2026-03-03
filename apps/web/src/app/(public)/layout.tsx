import { auth } from "@we-grow/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/groups");
  }

  return <>{children}</>;
}
