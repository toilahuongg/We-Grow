import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { TodosList } from "@/components/todos-list";

export default async function TodosPage() {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <TodosList />;
}
