import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePassword, type PasswordValidation } from "@/lib/auth/passwordValidation";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

interface Rule {
  key: keyof Omit<PasswordValidation, "isValid">;
  label: string;
}

const RULES: Rule[] = [
  { key: "hasMinLength",    label: "Pelo menos 8 caracteres" },
  { key: "hasLetter",       label: "Uma letra (a-z ou A-Z)" },
  { key: "hasNumber",       label: "Um número (0-9)" },
  { key: "hasNoEdgeSpaces", label: "Sem espaços no início ou fim" },
];

export function PasswordRequirements({ password, className }: PasswordRequirementsProps) {
  const validation = validatePassword(password);

  return (
    <ul
      className={cn("space-y-1.5 mt-3", className)}
      aria-label="Requisitos da senha"
    >
      {RULES.map((rule) => {
        const met = validation[rule.key];
        return (
          <li key={rule.key} className="flex items-center gap-2 text-sm">
            {met ? (
              <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-600 shrink-0" aria-hidden="true" />
            )}
            <span className={cn(met ? "text-zinc-100" : "text-zinc-500")}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
