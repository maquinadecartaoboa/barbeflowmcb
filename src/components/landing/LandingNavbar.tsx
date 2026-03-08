import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { getDashboardUrl } from "@/lib/hostname";
import { useAuth } from "@/hooks/useAuth";
import logoBranca from "@/assets/modoGESTOR_branca.png";

export default function LandingNavbar() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0c0c0c]/90 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <img src={logoBranca} alt="modoGESTOR" className="h-6 sm:h-7" />

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <a href={getDashboardUrl("/app/dashboard")}>
              <Button size="sm" className="bg-[#d4a843] hover:bg-[#c49a3a] text-black font-semibold rounded-lg text-sm">
                Meu Painel
              </Button>
            </a>
          ) : (
            <>
              <a href={getDashboardUrl("/app/login")} className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-sm">
                  Entrar
                </Button>
              </a>
              <a href={getDashboardUrl("/app/login")}>
                <Button size="sm" className="bg-[#d4a843] hover:bg-[#c49a3a] text-black font-semibold rounded-lg text-sm">
                  Começar grátis
                </Button>
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
