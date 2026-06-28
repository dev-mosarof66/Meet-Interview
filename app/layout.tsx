import "./globals.css";
import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import { AuthProvider } from "@/components/AuthModal";

export const metadata: Metadata = {
  title: "Meet Interview — Get answered.",
  description:
    "AI job-search co-pilot that optimizes for responses, not applications.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('callback.theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
        <AuthProvider>
          <AuthShell>{children}</AuthShell>
        </AuthProvider>
      </body>
    </html>
  );
}
