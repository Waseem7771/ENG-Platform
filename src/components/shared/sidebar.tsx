"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  PencilLine,
  Users,
  LogOut,
  Route,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/components/providers/locale-provider";
import { signOut } from "@/lib/auth-client";
import { LanguageToggle } from "@/components/shared/language-toggle";

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
}

const teacherNav: NavItem[] = [
  { key: "nav.dashboard", href: "/teacher", icon: LayoutDashboard },
  { key: "nav.classes", href: "/teacher/classes", icon: BookOpen },
  { key: "nav.sessions", href: "/teacher/sessions", icon: Video },
  { key: "nav.content", href: "/teacher/exercises", icon: PencilLine },
  { key: "nav.students", href: "/teacher/students", icon: Users },
];

const studentNav: NavItem[] = [
  { key: "nav.learn", href: "/student", icon: Route },
  { key: "nav.practice", href: "/student/practice", icon: PencilLine },
  { key: "nav.myClasses", href: "/student/classes", icon: BookOpen },
  { key: "nav.progress", href: "/student/progress", icon: LineChart },
];

/**
 * Dashboard-root entries ("/teacher", "/student") match exactly only — a prefix match
 * would otherwise make them "active" on every nested route. All other entries match
 * their href or any nested path below it, so e.g. /teacher/students/[id] still
 * highlights the Students nav item. The Content nav item is a special case: the new
 * exercise-authoring routes live under /teacher/content/exercises, a different path
 * than its own href (/teacher/exercises), so it's matched in addition.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/teacher" || href === "/student") {
    return pathname === href;
  }
  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }
  if (href === "/teacher/exercises") {
    return pathname === "/teacher/content" || pathname.startsWith("/teacher/content/");
  }
  return false;
}

export function Sidebar({
  role,
  user,
}: {
  role: "TEACHER" | "STUDENT";
  user?: { name: string; email: string };
}) {
  const pathname = usePathname();
  const t = useT();
  const navItems = role === "TEACHER" ? teacherNav : studentNav;

  return (
    <aside className="flex h-screen w-64 flex-col border-e-2 border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-btn bg-primary text-primary-foreground shadow-press-brand">
            <Route className="size-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            SpeakPath
          </span>
        </Link>
        <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          {t(role === "TEACHER" ? "nav.teacherDashboard" : "nav.studentDashboard")}
        </p>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative block">
              <motion.div
                className={`flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors duration-300 ${
                  isActive
                    ? "border-2 border-primary/25 bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-btn border-2 border-primary/25 bg-secondary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 size-5 shrink-0" />
                <span className="relative z-10">{t(item.key)}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Language toggle */}
      <div className="px-4 pt-4">
        <LanguageToggle className="w-full justify-start" />
      </div>

      {/* User + Sign out */}
      <div className="p-4">
        {user && (
          <div className="mb-2 flex items-center gap-3 rounded-btn px-3 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut().then(() => (window.location.href = "/"))}
          className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:bg-muted"
        >
          <LogOut className="size-4" />
          {t("common.signOut")}
        </button>
      </div>
    </aside>
  );
}
