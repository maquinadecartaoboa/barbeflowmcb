import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Mail, Lock, User, Building2, Phone, Eye, EyeOff } from "lucide-react";
import { getPublicUrl, isDashboardDomain } from "@/lib/hostname";
import { useState, useRef } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import logoBranca from "@/assets/modoGESTOR_branca.png";
import { trackCompleteRegistration, getTrackingData, trackLead } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { useTurnstile } from "@/hooks/useTurnstile";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { validatePassword } from "@/lib/auth/passwordValidation";
import { translateSupabaseAuthError } from "@/lib/auth/supabaseErrors";

const Login = () => {
  usePageTitle("Login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const passwordValidation = validatePassword(password);
  const passwordOkForMode = isSignUp ? passwordValidation.isValid : password.length > 0;
  const lastEmailFiredRef = useRef<string | null>(null);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const turnstile = useTurnstile();

  function handleEmailBlur() {
    if (!isSignUp) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    if (lastEmailFiredRef.current === trimmed) return;
    lastEmailFiredRef.current = trimmed;
    trackLead({ email: trimmed }, 'signup_email');
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstile.token) {
      toast({
        title: "Verificação de segurança",
        description: "Aguarde a verificação de segurança antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    if (isSignUp) {
      const phoneDigits = phone.replace(/\D/g, "");
      if (!ownerName.trim() || !businessName.trim() || phoneDigits.length < 10) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha seu nome, nome do negócio e telefone com DDD.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const tracking = getTrackingData();

      if (isSignUp) {
        const result = await signUp(email, password, {
          owner_name: ownerName.trim(),
          business_name: businessName.trim(),
          phone: phone.replace(/\D/g, ""),
          terms_accepted_at: new Date().toISOString(),
          visitor_id: tracking.visitor_id,
          meta_fbp: tracking.fbp || '',
          meta_fbc: tracking.fbc || '',
        }, { captchaToken: turnstile.token });

        if (result.error) {
          console.error('Auth failed:', result.error);
          if (result.error.message?.toLowerCase().includes('captcha')) {
            turnstile.reset();
            toast({
              title: "Verificação de segurança falhou",
              description: "Tente novamente.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao criar conta",
              description: translateSupabaseAuthError(result.error),
              variant: "destructive",
            });
          }
        } else if (result.data?.user) {
          const userId = result.data.user.id;
          trackCompleteRegistration({
            email,
            phone: phone.replace(/\D/g, ""),
            first_name: ownerName.trim().split(' ')[0],
            external_id: userId,
          });

          // Link visitor sessions for attribution (wait for trigger to create tenant)
          setTimeout(async () => {
            try {
              const { data: ut } = await supabase
                .from('users_tenant')
                .select('tenant_id')
                .eq('user_id', userId)
                .limit(1);
              if (ut && ut.length > 0) {
                const tenantId = ut[0].tenant_id;
                await supabase.rpc('link_visitor_attribution' as any, {
                  p_tenant_id: tenantId,
                  p_visitor_id: tracking.visitor_id,
                });
                await supabase
                  .from('tenants')
                  .update({
                    signup_user_agent: navigator.userAgent,
                    signup_completed_at: new Date().toISOString(),
                  } as any)
                  .eq('id', tenantId);
              }
            } catch (e) {
              console.warn('[TRACKING] Attribution linking failed:', e);
            }
          }, 2000);
        }
      } else {
        const { error } = await signIn(email, password, { captchaToken: turnstile.token });
        if (error) {
          console.error('Auth failed:', error);
          if (error.message?.toLowerCase().includes('captcha')) {
            turnstile.reset();
            toast({
              title: "Verificação de segurança falhou",
              description: "Tente novamente.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao entrar",
              description: translateSupabaseAuthError(error),
              variant: "destructive",
            });
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Back link */}
        <a 
          href={getPublicUrl('/')} 
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao início
        </a>

        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <img src={logoBranca} alt="modoGESTOR" className="h-10 mx-auto mb-4" />
          <p className="text-zinc-500 mt-1">
            {isSignUp ? "Crie sua conta" : "Entre na sua conta"}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-zinc-100">
              {isSignUp ? "Criar conta" : "Fazer login"}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {isSignUp 
                ? "Crie sua conta para gerenciar seu negócio" 
                : "Entre com seus dados para acessar o painel"
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ownerName" className="text-zinc-400 text-sm">
                    Seu nome *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                    <Input
                      id="ownerName"
                      type="text"
                      placeholder="João Silva"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      required
                      className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-zinc-400 text-sm">
                    Nome do negócio *
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                    <Input
                      id="businessName"
                      type="text"
                      placeholder="Barbearia do João"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-zinc-400 text-sm">
                    Telefone com DDD *
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      required
                      className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 text-sm">
                E-mail *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  required
                  className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 text-sm">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 pointer-events-none" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-11 pr-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                  // Safari only — informs iCloud Keychain about the rules the generated password must satisfy.
                  // Lowercase attribute is pass-through to native <input>; cast keeps TS quiet.
                  {...(isSignUp
                    ? ({ passwordrules: "minlength: 8; required: [a-zA-Z]; required: digit;" } as Record<string, string>)
                    : {})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {isSignUp && <PasswordRequirements password={password} />}
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <a
                  href={`${isDashboardDomain() ? '' : '/app'}/forgot-password`}
                  className="text-sm text-primary hover:text-primary-hover transition-colors"
                >
                  Esqueci minha senha
                </a>
              </div>
            )}

            {isSignUp && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-1 border-zinc-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label htmlFor="terms" className="text-xs text-zinc-400 leading-relaxed cursor-pointer">
                  Li e aceito os{" "}
                  <a href={getPublicUrl("/termos")} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Termos de Uso
                  </a>{" "}
                  e a{" "}
                  <a href={getPublicUrl("/privacidade")} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Política de Privacidade
                  </a>{" "}
                  do modoGESTOR.
                </label>
              </div>
            )}

            <TurnstileWidget {...turnstile.widgetProps} mode="non-interactive" />

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !turnstile.token || !passwordOkForMode || (isSignUp && !acceptedTerms)}
              className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? (isSignUp ? "Criando conta..." : "Entrando...")
                : (isSignUp ? "Criar conta" : "Entrar")
              }
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800/50">
            <p className="text-center text-sm text-zinc-500">
              {isSignUp ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:text-primary-hover font-medium transition-colors"
              >
                {isSignUp ? "Fazer login" : "Criar conta"}
              </button>
            </p>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Login;