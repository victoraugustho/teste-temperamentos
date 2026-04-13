import { redirect } from "next/navigation";
import PortalDashboard from "@/components/portal/PortalDashboard";
import { getPortalUserFromCookies } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const user = await getPortalUserFromCookies();
  if (!user) {
    redirect("/portal/login");
  }

  return (
    <PortalDashboard
      user={{
        id: user.id,
        email: user.email,
        nome: user.name,
      }}
    />
  );
}
