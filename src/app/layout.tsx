import "./globals.css";
import { Providers } from "@/components/layout/providers";
export const metadata={title:"Splitwise Clone",manifest:"/manifest.webmanifest"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>}
