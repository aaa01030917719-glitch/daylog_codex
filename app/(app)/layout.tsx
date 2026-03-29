import { AppShell } from "@/components/layout/AppShell";
import { DevResetButton } from "@/components/dev/DevResetButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      {process.env.NODE_ENV === "development" && <DevResetButton />}
    </AppShell>
  );
}
