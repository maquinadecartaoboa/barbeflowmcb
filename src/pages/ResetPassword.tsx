import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logoBranca from "@/assets/modoGESTOR_branca.png";
import { isDashboardDomain } from "@/lib/hostname";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { validatePassword } from "@/lib/auth/passwordValidation";
import { translateSupabaseAuthError } from "@/lib/auth/supabaseErrors";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const dashPrefix = isDashboardDomain() ? '' : '/app';

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
        if (session?.user?.email) setUserEmail(session.user.email);
      }
    });

    // Also check URL hash for recovery token (type=recovery)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecoveryFlow(true);
    }

    // Fill userEmail from current session (recovery already created a session)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  const validation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = validation.isValid && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validation.isValid) {
      setErrorMessage("A senha não atende a todos os requisitos.");
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        const translated = translateSupabaseAuthError(error);
        setErrorMessage(translated);
        toast({
          title: "Erro ao redefinir senha",
          description: translated,
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({
          title: "Senha atualizada!",
          description: "Sua senha foi redefinida com sucesso.",
        });
        setTimeout(() => {
          navigate(`${dashPrefix}/dashboard`);
        }, 1500);
      }
    } catch (err) {
      console.error('Update password error:', err);
      setErrorMessage("Não foi possível concluir a operação. Tente novamente em alguns minutos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <a
          href={`${dashPrefix}/login`}
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao login
        </a>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <img src={logoBranca} alt="modoGESTOR" className="h-10 mx-auto mb-4" />
          <p className="text-zinc-500 mt-1">Nova senha</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8"
        >
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-100">
                Senha atualizada!
              </h2>
              <p className="text-zinc-400 text-sm">
                Sua senha foi redefinida com sucesso. Redirecionando...
              </p>
            </div>
          ) : !isRecoveryFlow ? (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-zinc-100">
                Link inválido ou expirado
              </h2>
              <p className="text-zinc-400 text-sm">
                Este link de recuperação não é válido. Solicite um novo link na página de recuperação de senha.
              </p>
              <Button
                onClick={() => navigate(`${dashPrefix}/forgot-password`)}
                variant="outline"
                className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Solicitar novo link
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-zinc-100">
                  Defina sua nova senha
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Digite uma nova senha para sua conta
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Hidden username field — required for Chrome to associate
                    the saved password with the right user in its password manager. */}
                <input
                  type="email"
                  name="username"
                  autoComplete="username"
                  value={userEmail}
                  readOnly
                  hidden
                />

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-zinc-400 text-sm">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 pointer-events-none" />
                    <Input
                      id="new-password"
                      name="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      required
                      className="h-12 pl-11 pr-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                      // Safari: hint iCloud Keychain to generate matching passwords.
                      // Lowercase attribute is pass-through to native <input>; cast keeps TS quiet.
                      {...({ passwordrules: "minlength: 8; required: [a-zA-Z]; required: digit;" } as Record<string, string>)}
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
                  <PasswordRequirements password={password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-zinc-400 text-sm">
                    Confirmar senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 pointer-events-none" />
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-red-400 text-xs mt-1">As senhas não coincidem</p>
                  )}
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm"
                  >
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={!canSubmit}
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Salvando..." : "Redefinir senha"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
