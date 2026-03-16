import { useState } from "react";
import { Copy, Check, MessageSquare, Moon, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface WhatsAppMessagesSectionProps {
  tenantName: string;
  tenantSlug: string;
}

export function WhatsAppMessagesSection({ tenantName, tenantSlug }: WhatsAppMessagesSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bookingUrl = `https://www.modogestor.com.br/${tenantSlug}`;

  const greetingMessage = `Olá! 👋 Bem-vindo(a) à ${tenantName}!

Que bom ter você aqui! Para sua comodidade, agora você pode agendar seu horário de forma rápida e prática pelo nosso sistema online:

📅 *Agende agora:* ${bookingUrl}

Escolha o serviço, profissional, dia e horário que preferir — tudo pelo celular, sem precisar ligar!

Se precisar de algo mais, é só mandar uma mensagem. 😊`;

  const awayMessage = `Olá! No momento estamos fora do horário de atendimento. ⏰

Mas a boa notícia é que você pode agendar seu horário agora mesmo pelo nosso sistema online, disponível 24h:

📅 *Agende aqui:* ${bookingUrl}

É rápido, fácil e você garante o melhor horário! Assim que estivermos disponíveis, responderemos sua mensagem. 😊

${tenantName} agradece sua preferência! 💈`;

  const handleCopy = async (text: string, id: string) => {
    const plainText = text.replace(/\*([^*]+)\*/g, "$1");
    try {
      await navigator.clipboard.writeText(plainText);
      setCopiedId(id);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Não foi possível copiar a mensagem.");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Mensagens para o seu WhatsApp Business
        </CardTitle>
        <CardDescription>
          Copie e cole essas mensagens prontas no seu WhatsApp Business para direcionar seus clientes ao agendamento online.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Greeting Message */}
          <Card className="border border-border bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📱 Mensagem de Saudação</CardTitle>
              <CardDescription className="text-xs">
                Configure no WhatsApp Business → Ferramentas comerciais → Mensagem de saudação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-background p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {greetingMessage}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleCopy(greetingMessage, "greeting")}
              >
                {copiedId === "greeting" ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado ✓
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar mensagem
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Away Message */}
          <Card className="border border-border bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🌙 Mensagem de Ausência</CardTitle>
              <CardDescription className="text-xs">
                Configure no WhatsApp Business → Ferramentas comerciais → Mensagem de ausência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-background p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {awayMessage}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleCopy(awayMessage, "away")}
              >
                {copiedId === "away" ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado ✓
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar mensagem
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions Accordion */}
        <Accordion type="single" collapsible>
          <AccordionItem value="instructions" className="border-none">
            <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline">
              Como configurar no WhatsApp Business?
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Abra o <strong className="text-foreground">WhatsApp Business</strong> no seu celular</li>
                <li>Toque em <strong className="text-foreground">⋮ (menu) → Ferramentas comerciais</strong></li>
                <li>
                  Para <strong className="text-foreground">Mensagem de Saudação</strong>:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Toque em "Mensagem de saudação"</li>
                    <li>Ative a opção</li>
                    <li>Cole a mensagem copiada acima</li>
                    <li>Escolha os destinatários (recomendado: "Todos")</li>
                  </ul>
                </li>
                <li>
                  Para <strong className="text-foreground">Mensagem de Ausência</strong>:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Toque em "Mensagem de ausência"</li>
                    <li>Ative a opção</li>
                    <li>Cole a mensagem copiada acima</li>
                    <li>Configure o horário (recomendado: "Fora do horário de atendimento")</li>
                  </ul>
                </li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
