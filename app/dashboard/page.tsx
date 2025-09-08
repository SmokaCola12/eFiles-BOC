import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  return <DashboardContent user={user} />
}
