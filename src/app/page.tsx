import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/roles";
import { SplashScreen } from "./(auth)/splash/SplashScreen";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(roleHomePath(session.role));
  }
  return <SplashScreen />;
}
