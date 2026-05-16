"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { flushQueue } from "@/lib/offline-queue";
export function Providers({children}:{children:React.ReactNode}){const [client]=useState(()=>new QueryClient()); useEffect(()=>{if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>undefined); const sync=()=>flushQueue().then(()=>client.invalidateQueries()); window.addEventListener("online",sync); if(navigator.onLine) sync(); return()=>window.removeEventListener("online",sync);},[client]); return <ThemeProvider attribute="class" defaultTheme="system" enableSystem><QueryClientProvider client={client}>{children}</QueryClientProvider></ThemeProvider>}
