import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseBrazilianDate(dateStr: string): string | null {
  if (!dateStr || dateStr === "N/A" || dateStr.trim() === "") return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year) return null;
  const y = parseInt(year);
  const m = parseInt(month);
  const d = parseInt(day);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function CustomerImportExport() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [totalRows, setTotalRows] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      toast({ title: "Arquivo vazio", description: "O CSV não contém dados.", variant: "destructive" });
      return;
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").toLowerCase());

    // Map columns
    const nameIdx = headers.findIndex((h) => h.includes("nome"));
    const phoneIdx = headers.findIndex((h) => h.includes("telefone") || h.includes("phone"));
    const emailIdx = headers.findIndex((h) => h.includes("email"));
    const birthdayIdx = headers.findIndex((h) => h.includes("nascimento") || h.includes("birthday"));

    if (nameIdx === -1 || phoneIdx === -1) {
      toast({ title: "Formato inválido", description: "O CSV precisa ter colunas 'Nome' e 'Telefone'.", variant: "destructive" });
      return;
    }

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const name = cols[nameIdx]?.trim();
      const phone = normalizePhone(cols[phoneIdx] || "");
      const email = emailIdx >= 0 ? cols[emailIdx]?.trim() : null;
      const birthday = birthdayIdx >= 0 ? parseBrazilianDate(cols[birthdayIdx] || "") : null;

      if (!name || phone.length < 10) continue;
      rows.push({ name, phone, email: email || null, birthday });
    }

    setTotalRows(rows.length);
    setPreviewData(rows.slice(0, 5));
    // Store full data in a ref-like closure
    handleImport(rows);
  };

  const handleImport = async (rows: any[]) => {
    if (!currentTenant) return;
    setImporting(true);
    setProgress(0);

    const imported: number[] = [];
    const skipped: number[] = [];
    const errors: string[] = [];
    const batchSize = 20;

    // Get existing customers phones for dedup
    const { data: existing } = await supabase
      .from("customers")
      .select("phone")
      .eq("tenant_id", currentTenant.id);

    const existingPhones = new Set((existing || []).map((c) => normalizePhone(c.phone)));

    const toInsert = rows.filter((r) => {
      if (existingPhones.has(r.phone)) {
        skipped.push(1);
        return false;
      }
      return true;
    });

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize).map((r) => ({
        tenant_id: currentTenant.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        birthday: r.birthday,
      }));

      const { error } = await supabase.from("customers").insert(batch);
      if (error) {
        errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        imported.push(...batch.map(() => 1));
      }

      setProgress(Math.round(((i + batchSize) / toInsert.length) * 100));
    }

    setProgress(100);
    setResult({
      imported: imported.length,
      skipped: skipped.length,
      errors,
    });
    setImporting(false);

    toast({
      title: "Importação concluída",
      description: `${imported.length} clientes importados, ${skipped.length} já existiam.`,
    });
  };

  const handleExport = async () => {
    if (!currentTenant) return;
    setExporting(true);

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("name, phone, email, birthday, created_at")
        .eq("tenant_id", currentTenant.id)
        .order("name");

      if (error) throw error;

      const csvHeader = "Nome,Telefone,Email,Data de Nascimento,Data de Cadastro";
      const csvRows = (data || []).map((c) => {
        const birthday = c.birthday
          ? new Date(c.birthday + "T00:00:00").toLocaleDateString("pt-BR")
          : "";
        const created = new Date(c.created_at).toLocaleDateString("pt-BR");
        return `"${c.name}","${c.phone}","${c.email || ""}","${birthday}","${created}"`;
      });

      const csvContent = "\uFEFF" + csvHeader + "\n" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clientes-${currentTenant.slug}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Exportação concluída", description: `${data?.length || 0} clientes exportados.` });
    } catch (err: any) {
      toast({ title: "Erro na exportação", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Upload className="h-5 w-5 mr-2" />
            Importar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>O CSV deve conter pelo menos as colunas <strong>Nome</strong> e <strong>Telefone</strong>.</p>
              <p>Colunas opcionais: <strong>Email</strong>, <strong>Data de Nascimento</strong> (formato DD/MM/AAAA).</p>
              <p>Clientes com telefone já cadastrado serão ignorados automaticamente.</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            variant="outline"
            className="w-full"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            {importing ? "Importando..." : "Selecionar arquivo CSV"}
          </Button>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress}% concluído</p>
            </div>
          )}

          {previewData && !importing && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Prévia ({totalRows} registros encontrados):</p>
              <div className="space-y-0.5 bg-secondary/30 rounded p-2">
                {previewData.map((r, i) => (
                  <p key={i}>{r.name} — {r.phone}</p>
                ))}
                {totalRows > 5 && <p className="text-muted-foreground/60">...e mais {totalRows - 5}</p>}
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Resultado da importação</span>
              </div>
              <div className="flex gap-3 text-sm">
                <Badge variant="default" className="bg-emerald-600">{result.imported} importados</Badge>
                <Badge variant="secondary">{result.skipped} já existiam</Badge>
                {result.errors.length > 0 && (
                  <Badge variant="destructive">{result.errors.length} erros</Badge>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-1 mt-2">
                  {result.errors.map((e, i) => (
                    <p key={i} className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Download className="h-5 w-5 mr-2" />
            Exportar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Baixe todos os clientes da sua barbearia em formato CSV.
          </p>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
