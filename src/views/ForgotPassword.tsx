import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { getPublicUrl } from "@/lib/hostname";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
const logoBranca = "/images/modoGESTOR_branca.png";
import { isDashboardDomain } from "@/lib/hostname";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const dashPrefix = isDashboardDomain() ? '' : '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${dashPrefix}/reset-password`,
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSent(true);
        toast({
          title: "E-mail enviado!",
          description: "Verifique sua caixa de entrada para redefinir a senha.",
        });
      }
    } catch (err) {
      console.error('Reset password error:', err);
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
          <p className="text-zinc-500 mt-1">Recuperação de senha</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8"
        >
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-100">
                Verifique seu e-mail
              </h2>
              <p className="text-zinc-400 text-sm">
                Enviamos um link de recuperação para <strong className="text-zinc-200">{email}</strong>. 
                Clique no link para criar uma nova senha.
              </p>
              <p className="text-zinc-500 text-xs">
                Não recebeu? Verifique a pasta de spam ou tente novamente.
              </p>
              <Button
                variant="outline"
                onClick={() => setSent(false)}
                className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-zinc-100">
                  Esqueceu sua senha?
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Digite seu e-mail e enviaremos um link para redefinir sua senha
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-400 text-sm">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
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
                  {isLoading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
