import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DocsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <div>Docs page</div>;
}