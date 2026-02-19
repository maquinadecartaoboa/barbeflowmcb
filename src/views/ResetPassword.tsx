import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
const logoBranca = "/images/modoGESTOR_branca.png";
import { isDashboardDomain } from "@/lib/hostname";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const dashPrefix = isDashboardDomain() ? '' : '/app';

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
      }
    });

    // Also check URL hash for recovery token (type=recovery)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecoveryFlow(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas precisam ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha precisa ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({
          title: "Senha atualizada!",
          description: "Sua senha foi redefinida com sucesso.",
        });
      }
    } catch (err) {
      console.error('Update password error:', err);
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
                Sua senha foi redefinida com sucesso. Agora você pode acessar sua conta.
              </p>
              <Button
                onClick={() => navigate(`${dashPrefix}/dashboard`)}
                className="mt-4 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
              >
                Ir para o painel
              </Button>
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
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-400 text-sm">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-zinc-400 text-sm">
                    Confirmar senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
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
