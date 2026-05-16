"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const register = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      if (!register.ok) {
        const body = await register.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to register");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-md space-y-3">
      <h1 className="text-2xl font-bold">Register</h1>
      <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-xl border bg-transparent p-3" placeholder="Name" required />
      <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-xl border bg-transparent p-3" placeholder="Email" type="email" required />
      <div className="relative"><input value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-xl border bg-transparent p-3 pr-12" type={showPassword ? "text" : "password"} placeholder="Password" minLength={8} required /><button type="button" aria-label="Toggle password visibility" onClick={()=>setShowPassword(v=>!v)} className="absolute right-2 top-2 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full ${password.length > 11 && /[A-Z]/.test(password) && /\d/.test(password) ? "bg-emerald-500" : password.length >= 8 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, password.length * 9)}%` }} /></div>
      <input value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} className="w-full rounded-xl border bg-transparent p-3" type={showPassword ? "text" : "password"} placeholder="Confirm password" minLength={8} required />
      <p className="text-sm text-slate-500">After registration, your JWT session is created automatically and onboarding starts in the dashboard.</p>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-emerald-500 p-3 text-white disabled:opacity-60">{loading ? "Creating..." : "Create account"}</button>
      <p className="text-sm text-slate-500">Already registered? <Link className="text-emerald-500" href="/login">Login</Link></p>
    </form>
  );
}
