import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/sidebar";
import { LiveBanner } from "@/components/shared/live-banner";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?callbackUrl=/student");

  const user = session.user as typeof session.user & { role?: string };
  if (user.role === "TEACHER") redirect("/teacher");

  return (
    <div className="flex h-screen">
      <Sidebar role="STUDENT" user={{ name: user.name, email: user.email }} />
      {/* Content column: the cross-page live banner pins above the scrolling
          page area so it never overlaps the sidebar nav. It renders nothing
          (zero height) when no class is live, so full-height pages are
          unaffected. */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <LiveBanner />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
