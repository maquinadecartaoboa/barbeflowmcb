import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PITCH_MAX_LENGTH,
  PITCH_MIN_LENGTH,
  type OrderBumpMapping,
} from "./types";

interface Props {
  mapping: OrderBumpMapping | null;
  onOpenChange: (open: boolean) => void;
  onSave: (mappingId: string, text: string) => Promise<void> | void;
  onClear: (mappingId: string) => Promise<void> | void;
}

export function EditPitchDialog({ mapping, onOpenChange, onSave, onClear }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (mapping) {
      setText(mapping.custom_pitch ?? mapping.pitch_text ?? "");
    }
  }, [mapping?.id]);

  const open = !!mapping;
  const len = text.trim().length;
  const isValid = len >= PITCH_MIN_LENGTH && len <= PITCH_MAX_LENGTH;
  const hasManual = !!mapping?.custom_pitch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar pitch</DialogTitle>
          <DialogDescription>
            Esse texto aparece pro cliente na hora do checkout, abaixo do produto.
            Salvar trava como pitch manual e a IA não vai mais regenerar automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={PITCH_MAX_LENGTH + 20}
          rows={5}
          placeholder="Ex: Saindo do corte na tesoura você merece fixação à altura..."
          className="resize-none"
        />

        <div className="flex items-center justify-between text-xs">
          <span
            className={
              len > PITCH_MAX_LENGTH
                ? "text-destructive"
                : len === 0
                ? "text-muted-foreground"
                : "text-muted-foreground"
            }
          >
            {len}/{PITCH_MAX_LENGTH} caracteres
          </span>
          {len > PITCH_MAX_LENGTH && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" /> Limite excedido
            </span>
          )}
        </div>

        {hasManual && mapping?.pitch_text && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100/80 space-y-2">
            <p>
              <strong>Você tem pitch manual ativo.</strong> A IA não vai substituir esse
              texto automaticamente. Pra voltar a usar a versão da IA, clique em "Apagar
              pitch manual".
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {hasManual && (
            <Button
              variant="ghost"
              onClick={() => mapping && onClear(mapping.id)}
              className="mr-auto text-destructive hover:text-destructive"
            >
              Apagar pitch manual
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!isValid}
            onClick={() => mapping && onSave(mapping.id, text.trim())}
          >
            Salvar como manual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
