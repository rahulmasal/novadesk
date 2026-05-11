"use client";

import { useState, useEffect, useRef } from "react";
import { useTicketStore } from "@/lib/store";
import {
  LifeBuoy,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  Clock,
} from "lucide-react";

interface SecurityState {
  question: string;
  answer: string;
}

export function Login({ onLogin }: { onLogin: () => void }) {
  const { login } = useTicketStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [security, setSecurity] = useState<SecurityState | null>(null);
  const [userSecurityAnswer, setUserSecurityAnswer] = useState("");
  const [authProvider, setAuthProvider] = useState<"local" | "ldap">("local");

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 60;

  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef(remainingTime);

  const ldapEnabled = typeof window !== "undefined" && process.env.NEXT_PUBLIC_LDAP_ENABLED === "true";

  useEffect(() => {
    remainingTimeRef.current = remainingTime;
  }, [remainingTime]);

  useEffect(() => {
    if (lockoutTime && remainingTime > 0) {
      lockoutTimerRef.current = setTimeout(() => {
        const newTime = remainingTimeRef.current - 1;
        if (newTime <= 0) {
          setLockoutTime(null);
          setLoginAttempts(0);
          setSecurity(null);
        } else {
          setRemainingTime(newTime);
        }
      }, 1000);
      return () => {
        if (lockoutTimerRef.current) {
          clearTimeout(lockoutTimerRef.current);
        }
      };
    }
  }, [lockoutTime, remainingTime]);

  useEffect(() => {
    const storedAttempts = localStorage.getItem("loginAttempts");
    const storedLockout = localStorage.getItem("lockoutTime");
    if (storedAttempts) {
      const attempts = parseInt(storedAttempts, 10);
      setLoginAttempts(attempts);
    }
    if (storedLockout) {
      const storedTime = parseInt(storedLockout, 10);
      if (storedTime > Date.now()) {
        setLockoutTime(storedTime);
        setRemainingTime(Math.ceil((storedTime - Date.now()) / 1000));
      } else {
        localStorage.removeItem("lockoutTime");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("loginAttempts", loginAttempts.toString());
  }, [loginAttempts]);

  useEffect(() => {
    if (lockoutTime) {
      localStorage.setItem("lockoutTime", lockoutTime.toString());
    } else {
      localStorage.removeItem("lockoutTime");
    }
  }, [lockoutTime]);

  /**
   * validateInput - Checks email and password for basic validity
   * 
   * WHAT: Prevents obviously invalid inputs from being submitted
   * WHY: Better UX than server-side errors, reduces unnecessary requests
   * 
   * @param email - User's email input
   * @param password - User's password input
   * @returns Error message string if invalid, null if valid
   */
  const validateInput = (email: string, password: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Invalid email format";
    if (password.length < 1) return "Password is required";
    if (password.length > 128) return "Password is too long";
    return null;
  };

  /**
   * handleSubmit - Main form submission handler
   * 
   * FLOW:
   * 1. Prevent default form behavior
   * 2. Check if account is locked (show remaining time)
   * 3. Validate inputs (email format, password requirements)
   * 4. Verify security question answer if triggered
   * 5. Call login API with credentials
   * 6. Handle success (reset attempts, call onLogin) or failure (increment attempts)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (lockoutTime && Date.now() < lockoutTime) {
      setError(`Account locked. Try again in ${remainingTime}s`);
      return;
    }

    const validationError = validateInput(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (security && userSecurityAnswer !== security.answer) {
      setError("Security verification failed");
      setLoginAttempts(prev => prev + 1);
      return;
    }

    setIsLoading(true);
    const result = await login(email, password, authProvider);

    if (result.success) {
      setLoginAttempts(0);
      setSecurity(null);
      setUserSecurityAnswer("");
      onLogin();
    } else {
      setLoginAttempts(prev => prev + 1);
      setError(result.error || "Login failed");
      if (loginAttempts + 1 >= MAX_ATTEMPTS) {
        setLockoutTime(Date.now() + LOCKOUT_DURATION * 1000);
        setRemainingTime(LOCKOUT_DURATION);
      }
    }

    setIsLoading(false);
  };

  /**
   * formatTime - Converts seconds to MM:SS display format
   * 
   * @param seconds - Total seconds remaining
   * @returns Formatted string like "1:30" for 90 seconds
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-neutral-950 to-purple-900/20" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
      
      <div className="absolute top-4 right-4 flex items-center gap-2 text-neutral-400 text-sm">
        <Shield className="w-4 h-4" />
        <span>Secure Authentication</span>
      </div>

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

        {lockoutTime && remainingTime > 0 && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">Account Temporarily Locked</p>
              <p className="text-yellow-500 text-sm">Try again in {formatTime(remainingTime)}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {ldapEnabled && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAuthProvider("local")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  authProvider === "local"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                Local Auth
              </button>
              <button
                type="button"
                onClick={() => setAuthProvider("ldap")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  authProvider === "ldap"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                LDAP / Active Directory
              </button>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
              {authProvider === "ldap" ? "Username" : "Email Address"}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={authProvider === "ldap" ? "username" : "name@company.com"}
              required
              disabled={!!lockoutTime}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
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
                disabled={!!lockoutTime}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all pr-12 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!!lockoutTime}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1 disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {security && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <label className="block text-sm font-medium text-blue-300 mb-2">
                Security Verification: {security.question}
              </label>
              <input
                type="text"
                value={userSecurityAnswer}
                onChange={(e) => setUserSecurityAnswer(e.target.value)}
                placeholder="Enter answer"
                disabled={!!lockoutTime}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !!(lockoutTime && remainingTime > 0)}
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

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
            <span>Attempts: {loginAttempts}/{MAX_ATTEMPTS}</span>
            <span>•</span>
            <span>Protected against brute-force attacks</span>
          </div>
        </div>

        <p className="text-center text-neutral-500 text-xs mt-8">
          NovaDesk v2.0 • Secure Authentication
        </p>
      </div>
    </div>
  );
}