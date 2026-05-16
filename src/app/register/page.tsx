import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { RegisterForm } from "@/features/auth/register-form";

export default async function RegisterPage() {
  if (await currentUserId()) redirect("/dashboard");
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <RegisterForm />
    </main>
  );
}
