import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internal DocSend MVP",
  description: "Lean internal document sharing platform"
};

const themeInitScript = `
(() => {
  try {
    const key = "theme-preference";
    const saved = localStorage.getItem(key);
    const isSavedTheme = saved === "light" || saved === "dark";
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = isSavedTheme ? saved : (systemDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
