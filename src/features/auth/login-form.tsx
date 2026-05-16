"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to log in");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-md space-y-3">
      <h1 className="text-2xl font-bold">Login</h1>
      <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-xl border bg-transparent p-3" placeholder="Email" type="email" required />
      <div className="relative"><input value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-xl border bg-transparent p-3 pr-12" type={showPassword ? "text" : "password"} placeholder="Password" minLength={8} required /><button type="button" aria-label="Toggle password visibility" onClick={()=>setShowPassword(v=>!v)} className="absolute right-2 top-2 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>
      <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />Remember me</label><Link className="text-emerald-500" href="/forgot-password">Forgot password?</Link></div>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-emerald-500 p-3 text-white disabled:opacity-60">{loading ? "Logging in..." : "Login"}</button>
      <p className="text-sm text-slate-500">New here? <Link className="text-emerald-500" href="/register">Create an account</Link></p>
    </form>
  );
}
