import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { PinUnlockModal } from "./PinUnlockModal";

interface ProtectedPageGuardProps {
  pageSlug: string;
  children: React.ReactNode;
}

const UNLOCK_TTL_MS = 30 * 60 * 1000;

const storageKey = (tenantId: string, slug: string) =>
  `pin_unlocked_${tenantId}_${slug}`;

export function ProtectedPageGuard({ pageSlug, children }: ProtectedPageGuardProps) {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();

  const [unlocked, setUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const protectedPages: string[] =
    (currentTenant?.settings as any)?.protected_pages || [];
  const requiresPin = !!currentTenant && protectedPages.includes(pageSlug);

  useEffect(() => {
    if (!currentTenant) return;

    if (!requiresPin) {
      setUnlocked(true);
      setShowPinModal(false);
      return;
    }

    const key = storageKey(currentTenant.id, pageSlug);
    const cached = sessionStorage.getItem(key);
    if (cached) {
      try {
        const { expiresAt } = JSON.parse(cached);
        if (typeof expiresAt === "number" && Date.now() < expiresAt) {
          setUnlocked(true);
          setShowPinModal(false);
          return;
        }
      } catch {
        // fall through to clearing
      }
      sessionStorage.removeItem(key);
    }

    setUnlocked(false);
    setShowPinModal(true);
  }, [requiresPin, currentTenant?.id, pageSlug]);

  const handleVerify = async (pin: string) => {
    if (!currentTenant) return false;

    const { data: valid, error } = await supabase.rpc(
      "verify_tenant_pin" as any,
      { p_tenant_id: currentTenant.id, p_pin: pin }
    );

    if (error || !valid) {
      toast.error("PIN incorreto");
      return false;
    }

    sessionStorage.setItem(
      storageKey(currentTenant.id, pageSlug),
      JSON.stringify({ expiresAt: Date.now() + UNLOCK_TTL_MS })
    );

    setUnlocked(true);
    setShowPinModal(false);
    return true;
  };

  const handleCancel = () => {
    setShowPinModal(false);
    navigate(-1);
  };

  if (!unlocked) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-3 min-h-[400px] text-muted-foreground">
          <Lock className="w-12 h-12" />
          <p className="text-sm">Página protegida por PIN</p>
        </div>
        <PinUnlockModal
          open={showPinModal}
          onVerify={handleVerify}
          onCancel={handleCancel}
        />
      </>
    );
  }

  return <>{children}</>;
}
