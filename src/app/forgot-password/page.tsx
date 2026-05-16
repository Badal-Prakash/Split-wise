"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { buttonClass, Field, inputClass, StatusBanner } from "@/components/app/ui";
import { apiRequest } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center p-4"><div className="card w-full max-w-md">Loading...</div></main>}><ForgotPasswordForm /></Suspense>;
}

function ForgotPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (token) {
        await apiRequest("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
        setResult("Password reset. You can log in now.");
      } else {
        const data = await apiRequest<any>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
        setResult(data.resetUrl ? `Reset link generated for development: ${data.resetUrl}` : "If that email exists, a reset link has been sent.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3">
        <h1 className="text-2xl font-bold">{token ? "Reset password" : "Forgot password"}</h1>
        {error && <StatusBanner kind="error">{error}</StatusBanner>}
        {result && <StatusBanner kind="success">{result}</StatusBanner>}
        {token ? <Field label="New password"><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required /></Field> : <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required /></Field>}
        <button disabled={loading} className={buttonClass + " w-full"}>{loading ? "Working..." : token ? "Reset password" : "Send reset link"}</button>
        <p className="text-sm text-slate-500"><Link className="text-emerald-500" href="/login">Back to login</Link></p>
      </form>
    </main>
  );
}
