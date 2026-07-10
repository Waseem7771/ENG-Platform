"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "@/lib/auth-client";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const teacherNav: NavItem[] = [
  { label: "Dashboard", href: "/teacher", icon: "📊" },
  { label: "Classes", href: "/teacher/classes", icon: "📚" },
  { label: "Sessions", href: "/teacher/sessions", icon: "🎥" },
  { label: "Exercises", href: "/teacher/exercises", icon: "✏️" },
  { label: "Students", href: "/teacher/students", icon: "👥" },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: "📊" },
  { label: "Sessions", href: "/student/sessions", icon: "🎥" },
  { label: "Exercises", href: "/student/exercises", icon: "✏️" },
  { label: "AI Chat", href: "/student/ai-chat", icon: "💬" },
  { label: "Placement", href: "/student/placement", icon: "📝" },
];

export function Sidebar({
  role,
  user,
}: {
  role: "TEACHER" | "STUDENT";
  user?: { name: string; email: string };
}) {
  const pathname = usePathname();
  const navItems = role === "TEACHER" ? teacherNav : studentNav;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/5 bg-sidebar">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
            S
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Speak<span className="text-violet-400">Path</span>
          </span>
        </Link>
        <p className="mt-2 text-[10px] uppercase tracking-widest text-white/25">
          {role === "TEACHER" ? "Teacher" : "Student"} Dashboard
        </p>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/5" />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative block"
            >
              <motion.div
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-300 ${
                  isActive
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl border border-violet-500/20 bg-violet-500/10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-base">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/5" />

      {/* User + Sign out */}
      <div className="p-4">
        {user && (
          <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/40 to-blue-500/40 text-xs font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{user.name}</p>
              <p className="truncate text-[11px] text-white/30">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut().then(() => (window.location.href = "/"))}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/25 transition-colors duration-300 hover:text-white/50"
        >
          <span>🚪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
