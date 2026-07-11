import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance & Life Dashboard",
  description: "Dashboard personal para finanzas, activos y hábitos."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Sidebar />
            <main className="min-h-screen pl-72">
              <div className="mx-auto w-full max-w-7xl px-8 py-8">{children}</div>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
