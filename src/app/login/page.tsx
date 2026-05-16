import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { LoginForm } from "@/features/auth/login-form";

export default async function LoginPage() {
  if (await currentUserId()) redirect("/dashboard");
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <LoginForm />
    </main>
  );
}
