"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Building2,
  User,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "database" | "organization" | "admin" | "complete";

interface SetupData {
  dbConnected: boolean;
  organizationName: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("database");
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dbStatus, setDbStatus] = useState<"checking" | "success" | "error">("checking");
  const [dbError, setDbError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [data, setData] = useState<SetupData>({
    dbConnected: false,
    organizationName: "",
    adminEmail: "",
    adminPassword: "",
    adminName: "",
  });

  // Check database connection on mount
  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  const checkDatabaseConnection = async () => {
    setIsCheckingDb(true);
    setDbStatus("checking");
    setError("");

    try {
      const res = await fetch("/api/setup/check-db");
      const result = await res.json();

      if (result.connected) {
        setDbStatus("success");
        setData((prev) => ({ ...prev, dbConnected: true }));
      } else {
        setDbStatus("error");
        setDbError(result.error || "Failed to connect to database");
      }
    } catch {
      setDbStatus("error");
      setDbError("Network error while checking database connection");
    } finally {
      setIsCheckingDb(false);
      setIsLoading(false);
    }
  };

  const validateStep = (step: Step): boolean => {
    const errors: Record<string, string> = {};

    if (step === "organization") {
      if (!data.organizationName || data.organizationName.length < 2) {
        errors.organizationName = "Organization name must be at least 2 characters";
      } else if (data.organizationName.length > 100) {
        errors.organizationName = "Organization name must be less than 100 characters";
      }
    }

    if (step === "admin") {
      if (!data.adminName || data.adminName.length < 2) {
        errors.adminName = "Name must be at least 2 characters";
      }

      if (!data.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) {
        errors.adminEmail = "Please enter a valid email address";
      }

      if (!data.adminPassword || data.adminPassword.length < 8) {
        errors.adminPassword = "Password must be at least 8 characters";
      } else if (!/[A-Z]/.test(data.adminPassword)) {
        errors.adminPassword = "Password must contain at least one uppercase letter";
      } else if (!/[a-z]/.test(data.adminPassword)) {
        errors.adminPassword = "Password must contain at least one lowercase letter";
      } else if (!/[0-9]/.test(data.adminPassword)) {
        errors.adminPassword = "Password must contain at least one number";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = async () => {
    if (!validateStep(currentStep)) return;

    const steps: Step[] = ["database", "organization", "admin", "complete"];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex < steps.length - 1) {
      if (currentStep === "admin") {
        await completeSetup();
      } else {
        setCurrentStep(steps[currentIndex + 1]);
      }
    }
  };

  const prevStep = () => {
    const steps: Step[] = ["database", "organization", "admin", "complete"];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const completeSetup = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: data.organizationName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          adminName: data.adminName,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to complete setup");
        return;
      }

      setCurrentStep("complete");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    router.push("/");
  };

  const updateData = (field: keyof SetupData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    setError("");
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: "database", label: "Database", icon: Database },
      { key: "organization", label: "Organization", icon: Building2 },
      { key: "admin", label: "Admin Account", icon: User },
    ];
    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
      <div className="flex items-center justify-center gap-4 mb-10">
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isComplete = index < currentIndex || currentStep === "complete";
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                  isActive && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                  isComplete && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                  !isActive && !isComplete && "bg-white/5 text-neutral-500 border border-white/10"
                )}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : isActive ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 text-xs font-bold text-center">{index + 1}</span>
                )}
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-px mx-2",
                    isComplete ? "bg-emerald-500" : "bg-white/10"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDatabaseStep = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-flex p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <Database className="w-10 h-10 text-blue-400" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Connect Your Database</h2>
      <p className="text-neutral-400 mb-8 max-w-md mx-auto">
        NovaDesk uses PostgreSQL for data storage. Let&apos;s verify your database connection.
      </p>

      <div className="max-w-sm mx-auto">
        {dbStatus === "checking" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-neutral-400">Checking database connection...</p>
          </div>
        )}

        {dbStatus === "success" && (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-emerald-500/20">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-emerald-400 font-medium">Database connected successfully!</p>
            <p className="text-neutral-500 text-sm">Your PostgreSQL database is ready to use.</p>
          </div>
        )}

        {dbStatus === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 font-medium">Connection Failed</p>
            <p className="text-neutral-500 text-sm max-w-xs text-center">{dbError}</p>
            <button
              onClick={checkDatabaseConnection}
              disabled={isCheckingDb}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              {isCheckingDb ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                "Retry Connection"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderOrganizationStep = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-flex p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <Building2 className="w-10 h-10 text-purple-400" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Name Your Organization</h2>
      <p className="text-neutral-400 mb-8 max-w-md mx-auto">
        Give your NovaDesk instance a name. This will appear in emails and notifications.
      </p>

      <div className="max-w-sm mx-auto text-left">
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Organization Name
        </label>
        <input
          type="text"
          value={data.organizationName}
          onChange={(e) => updateData("organizationName", e.target.value)}
          placeholder="Acme Corporation"
          className={cn(
            "w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-neutral-500",
            "focus:outline-none focus:ring-1 transition-all",
            validationErrors.organizationName
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-white/10 focus:border-blue-500 focus:ring-blue-500"
          )}
        />
        {validationErrors.organizationName && (
          <p className="text-red-400 text-sm mt-2">{validationErrors.organizationName}</p>
        )}
        <p className="text-neutral-500 text-xs mt-2">
          This will be used in email notifications and the support portal header.
        </p>
      </div>
    </div>
  );

  const renderAdminStep = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="w-10 h-10 text-emerald-400" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Create Admin Account</h2>
      <p className="text-neutral-400 mb-8 max-w-md mx-auto">
        Create the initial administrator account. This user will have full access to manage the system.
      </p>

      <div className="max-w-sm mx-auto text-left space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={data.adminName}
            onChange={(e) => updateData("adminName", e.target.value)}
            placeholder="John Doe"
            className={cn(
              "w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-neutral-500",
              "focus:outline-none focus:ring-1 transition-all",
              validationErrors.adminName
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-white/10 focus:border-blue-500 focus:ring-blue-500"
            )}
          />
          {validationErrors.adminName && (
            <p className="text-red-400 text-sm mt-2">{validationErrors.adminName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={data.adminEmail}
            onChange={(e) => updateData("adminEmail", e.target.value)}
            placeholder="admin@company.com"
            className={cn(
              "w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-neutral-500",
              "focus:outline-none focus:ring-1 transition-all",
              validationErrors.adminEmail
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-white/10 focus:border-blue-500 focus:ring-blue-500"
            )}
          />
          {validationErrors.adminEmail && (
            <p className="text-red-400 text-sm mt-2">{validationErrors.adminEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={data.adminPassword}
              onChange={(e) => updateData("adminPassword", e.target.value)}
              placeholder="Min. 8 characters"
              className={cn(
                "w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-neutral-500",
                "focus:outline-none focus:ring-1 transition-all pr-12",
                validationErrors.adminPassword
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-white/10 focus:border-blue-500 focus:ring-blue-500"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {validationErrors.adminPassword && (
            <p className="text-red-400 text-sm mt-2">{validationErrors.adminPassword}</p>
          )}
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-neutral-500">Password requirements:</p>
            <div className="flex flex-wrap gap-2">
              <span className={cn(
                "text-xs px-2 py-1 rounded",
                data.adminPassword.length >= 8 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-neutral-500"
              )}>
                8+ characters
              </span>
              <span className={cn(
                "text-xs px-2 py-1 rounded",
                /[A-Z]/.test(data.adminPassword) ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-neutral-500"
              )}>
                Uppercase
              </span>
              <span className={cn(
                "text-xs px-2 py-1 rounded",
                /[a-z]/.test(data.adminPassword) ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-neutral-500"
              )}>
                Lowercase
              </span>
              <span className={cn(
                "text-xs px-2 py-1 rounded",
                /[0-9]/.test(data.adminPassword) ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-neutral-500"
              )}>
                Number
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <Sparkles className="w-10 h-10 text-emerald-400" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Setup Complete!</h2>
      <p className="text-neutral-400 mb-8 max-w-md mx-auto">
        NovaDesk has been successfully configured. You can now sign in with your admin account.
      </p>

      <div className="max-w-sm mx-auto p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-medium">{data.adminName}</p>
            <p className="text-neutral-500 text-sm">{data.adminEmail}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-neutral-950 to-purple-900/20" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />

      <div className="relative w-full max-w-lg px-6">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome to NovaDesk
          </h1>
          <p className="text-neutral-400 mt-2">
            Let&apos;s get your helpdesk up and running
          </p>
        </div>

        {currentStep !== "complete" && renderStepIndicator()}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : currentStep === "database" ? (
            renderDatabaseStep()
          ) : currentStep === "organization" ? (
            renderOrganizationStep()
          ) : currentStep === "admin" ? (
            renderAdminStep()
          ) : (
            renderCompleteStep()
          )}

          {error && (
            <div className="mt-6 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {currentStep !== "database" && currentStep !== "complete" && (
            <button
              onClick={prevStep}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10 flex-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {currentStep === "complete" ? (
            <button
              onClick={goToLogin}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-95 flex-1"
            >
              Go to Login
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : currentStep === "database" ? (
            <button
              onClick={nextStep}
              disabled={dbStatus !== "success" || isCheckingDb}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-95 disabled:scale-100 flex-1"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-95 disabled:scale-100 flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  {currentStep === "admin" ? "Complete Setup" : "Continue"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>

        <p className="text-center text-neutral-500 text-xs mt-6">
          NovaDesk Setup Wizard v2.0
        </p>
      </div>
    </div>
  );
}