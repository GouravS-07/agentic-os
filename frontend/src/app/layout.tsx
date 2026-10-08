import type { Metadata } from "next";
import "./globals.css";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { SceneRoot } from "@/scene/components/SceneRoot";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Agentic OS — AI Operating System & Agent Command Center",
  description: "Turn goals into autonomous actions • Orchestrate DAGs, Agents, Tools & Memory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground h-screen w-screen overflow-hidden antialiased selection:bg-primary/30 selection:text-white">
        <SpatialBackground />
        <SceneRoot />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
