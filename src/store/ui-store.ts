import { create } from "zustand";
export const useUiStore = create<{ mobileMenuOpen:boolean; setMobileMenuOpen:(v:boolean)=>void }>(set=>({mobileMenuOpen:false,setMobileMenuOpen:v=>set({mobileMenuOpen:v})}));
