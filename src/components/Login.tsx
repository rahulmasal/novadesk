"use client";

import { useState } from "react";
import { useTicketStore, Role } from "@/lib/store";
import {
  LifeBuoy,
  Shield,
  User,
  Headset,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Login({ onLogin }: { onLogin: () => void }) {
  const { login } = useTicketStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      onLogin();
    } else {
      setError(result.error || "Login failed");
    }

    setIsLoading(false);
  };

  const demoAccounts = [
    {
      email: "admin@novadesk.com",
      password: "admin123",
      role: "Administrator",
      color: "emerald",
    },
    {
      email: "sarah@novadesk.com",
      password: "agent123",
      role: "Agent",
      color: "purple",
    },
    {
      email: "mike@example.com",
      password: "user123",
      role: "End User",
      color: "blue",
    },
  ];

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-neutral-950 to-purple-900/20" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />

      <div className="relative w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <LifeBuoy className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Welcome to NovaDesk
          </h1>
          <p className="text-neutral-400">
            Sign in to access the support portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white py-4 rounded-2xl font-bold text-lg transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-neutral-950 text-neutral-500">
                Demo Accounts
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {demoAccounts.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => fillDemo(demo.email, demo.password)}
                className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all group"
              >
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    demo.color === "blue" && "bg-blue-500/20 text-blue-400",
                    demo.color === "purple" &&
                      "bg-purple-500/20 text-purple-400",
                    demo.color === "emerald" &&
                      "bg-emerald-500/20 text-emerald-400",
                  )}
                >
                  {demo.role === "Administrator" && (
                    <Shield className="w-5 h-5" />
                  )}
                  {demo.role === "Agent" && <Headset className="w-5 h-5" />}
                  {demo.role === "End User" && <User className="w-5 h-5" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">{demo.role}</p>
                  <p className="text-xs text-neutral-500">{demo.email}</p>
                </div>
                <div className="text-xs text-neutral-500 group-hover:text-white transition-colors">
                  Click to fill
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-neutral-500 text-xs mt-8">
          Secure Authentication • NovaDesk v2.0
        </p>
      </div>
    </div>
  );
}
