import { useState } from "react";
import { useThemeConfig } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Palette, Sun, Moon, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACCENT_COLORS = [
  { hex: "#FFC300", name: "Ouro" },
  { hex: "#3B82F6", name: "Azul" },
  { hex: "#10B981", name: "Esmeralda" },
  { hex: "#8B5CF6", name: "Violeta" },
  { hex: "#EF4444", name: "Vermelho" },
  { hex: "#EC4899", name: "Rosa" },
  { hex: "#F97316", name: "Laranja" },
  { hex: "#06B6D4", name: "Ciano" },
];

export function AppearanceTab() {
  const { themeMode, accentColor, setThemeMode, setAccentColor, saveThemeSettings, saving } = useThemeConfig();
  const { toast } = useToast();
  const [customColor, setCustomColor] = useState(accentColor);

  const handleSave = async () => {
    await saveThemeSettings();
    toast({
      title: "Aparência salva",
      description: "As configurações visuais foram atualizadas.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {themeMode === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Modo de Tema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-foreground font-medium">
                {themeMode === "dark" ? "Modo Escuro" : "Modo Claro"}
              </Label>
              <p className="text-sm text-muted-foreground">
                Alterne entre o tema claro e escuro
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Sun className={`h-4 w-4 ${themeMode === "light" ? "text-primary" : "text-muted-foreground"}`} />
              <Switch
                checked={themeMode === "dark"}
                onCheckedChange={(checked) => setThemeMode(checked ? "dark" : "light")}
              />
              <Moon className={`h-4 w-4 ${themeMode === "dark" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Cor de Destaque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escolha a cor principal dos botões, ícones e destaques do painel.
          </p>
          
          {/* Preset colors */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.hex}
                onClick={() => {
                  setAccentColor(color.hex);
                  setCustomColor(color.hex);
                }}
                className={`group flex flex-col items-center gap-1.5`}
              >
                <div
                  className={`w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center ring-2 ${
                    accentColor.toLowerCase() === color.hex.toLowerCase()
                      ? "ring-foreground scale-110 shadow-lg"
                      : "ring-transparent hover:ring-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {accentColor.toLowerCase() === color.hex.toLowerCase() && (
                    <Check className="h-5 w-5 text-white drop-shadow-md" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{color.name}</span>
              </button>
            ))}
          </div>

          {/* Custom color */}
          <div className="flex items-center gap-3 pt-2">
            <Label className="text-foreground whitespace-nowrap">Cor personalizada:</Label>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setAccentColor(e.target.value);
                }}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
              />
              <Input
                value={customColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomColor(val);
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    setAccentColor(val);
                  }
                }}
                placeholder="#FFC300"
                className="max-w-[140px] font-mono"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Preview</p>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm">Botão Primário</Button>
              <Button size="sm" variant="outline">Outline</Button>
              <Button size="sm" variant="secondary">Secundário</Button>
              <span className="text-primary font-semibold text-sm">Texto destaque</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar Aparência
        </Button>
      </div>
    </div>
  );
}
