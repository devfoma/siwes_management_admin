import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { SIWESProvider } from "../context/SIWESContext";

export const metadata: Metadata = {
  title: "SIWES Connect Admin Portal",
  description: "AI-Enhanced Industrial Work Management System for Administrators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <SIWESProvider>
            {children}
          </SIWESProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
