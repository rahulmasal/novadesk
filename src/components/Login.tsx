"use client";

import { useState } from "react";
import { useTicketStore, Role } from "@/lib/store";
import { LifeBuoy, Shield, User, Headset, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Login({ onLogin }: { onLogin: () => void }) {
  const { setRole } = useTicketStore();
  const [selectedRole, setSelectedRole] = useState<Role>("End User");

  const roles = [
    {
      id: "End User" as Role,
      title: "Customer / Employee",
      desc: "Log issues, track your tickets, and communicate with support.",
      icon: User,
      color: "blue"
    },
    {
      id: "Agent" as Role,
      title: "Support Agent",
      desc: "Manage the ticket queue, resolve issues, and view analytics.",
      icon: Headset,
      color: "purple"
    },
    {
      id: "Administrator" as Role,
      title: "System Admin",
      desc: "Full access to settings, user management, and advanced reports.",
      icon: Shield,
      color: "emerald"
    }
  ];

  const handleLogin = () => {
    setRole(selectedRole);
    onLogin();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-neutral-950 to-purple-900/20" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
      
      <div className="relative w-full max-w-2xl px-6">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <LifeBuoy className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Welcome to NovaDesk</h1>
          <p className="text-neutral-400">Select your access level to enter the support portal</p>
        </div>

        <div className="grid gap-4 mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "group relative p-6 rounded-2xl border text-left transition-all duration-300",
                selectedRole === role.id
                  ? "bg-white/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-5">
                <div className={cn(
                  "p-3 rounded-xl transition-colors",
                  selectedRole === role.id ? "bg-blue-500 text-white" : "bg-neutral-800 text-neutral-400 group-hover:text-white"
                )}>
                  <role.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{role.title}</h3>
                  <p className="text-sm text-neutral-400">{role.desc}</p>
                </div>
                {selectedRole === role.id && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-95"
        >
          Enter Portal
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-center text-neutral-500 text-xs mt-8">
          Secure SSO Authentication • Version 2.0.4
        </p>
      </div>
    </div>
  );
}
