

# Tema Claro/Escuro + Cor de Destaque Personalizável

## Resumo
Adicionar nas configurações a opção de alternar entre tema claro e escuro, e permitir que o cliente escolha uma cor de destaque (primária) para todo o painel administrativo. As preferências são salvas por tenant no campo `settings` (JSON) que já existe no banco.

## Como vai funcionar

O sistema já usa CSS variables (`--primary`, `--background`, etc.) para todas as cores. A implementação consiste em:

1. Criar um **ThemeProvider** que lê as preferências do tenant e aplica dinamicamente as variáveis CSS no `<html>`
2. Definir um **tema claro** completo (fundos claros, textos escuros)
3. Adicionar uma **aba "Aparência"** nas configurações com toggle claro/escuro e seletor de cor
4. Converter hardcoded dark colors (como `bg-zinc-950`, `text-zinc-100`, `border-zinc-800`) para usar as variáveis semânticas do Tailwind (`bg-background`, `text-foreground`, `border-border`)

## Detalhes Técnicos

### 1. Novo arquivo: `src/contexts/ThemeContext.tsx`
- Cria um contexto React que gerencia `themeMode` ("light" | "dark") e `accentColor` (string hex)
- Lê os valores de `currentTenant.settings.theme_mode` e `currentTenant.settings.accent_color`
- Aplica a classe `dark` / `light` no `<html>` e injeta override de `--primary` via `document.documentElement.style`
- Converte a cor hex escolhida para HSL para manter compatibilidade com o sistema de design
- Calcula automaticamente `--primary-foreground` (preto ou branco) baseado na luminosidade da cor

### 2. Tema claro em `src/index.css`
- Definir variáveis `:root` (tema claro) com:
  - `--background`: branco/cinza claro
  - `--foreground`: preto/cinza escuro
  - `--card`, `--popover`: fundos claros
  - `--border`, `--input`, `--muted`: tons de cinza claro
  - `--sidebar-*`: versões claras
- Mover o tema escuro atual para `.dark { ... }`

### 3. Nova aba "Aparência" em `src/pages/Settings.tsx`
- Toggle claro/escuro com preview visual
- Grade de cores predefinidas (amarelo, azul, verde, roxo, vermelho, rosa, laranja)
- Input para cor customizada (hex)
- Preview em tempo real antes de salvar
- Salva em `tenants.settings` como `{ theme_mode, accent_color }`

### 4. Atualizar navegação em `AppShell.tsx`
- Adicionar item "Aparência" no submenu de Configurações (`/app/settings?tab=appearance`)
- Ícone: `Palette` do lucide-react

### 5. Refatorar cores hardcoded
Os seguintes arquivos precisam ter cores fixas (`zinc-950`, `zinc-800`, etc.) substituídas por variáveis semânticas para responder ao tema:
- `src/components/layout/AppShell.tsx` - sidebar, header, bottom tabs
- `src/components/ui/input.tsx` - border e background fixos
- `src/components/ui/button.tsx` - ring-offset hardcoded
- `src/components/ui/dropdown-menu.tsx` - backgrounds fixos
- Demais componentes UI com cores `zinc-*` hardcoded

### 6. Envolver App com ThemeProvider
- Em `src/App.tsx`, envolver o conteúdo com `<ThemeProvider>` (dentro do `QueryClientProvider` para ter acesso ao tenant)

## Paleta de cores sugeridas para o seletor

| Cor | Hex | Nome |
|-----|-----|------|
| Amarelo (atual) | #FFC300 | Ouro |
| Azul | #3B82F6 | Azul |
| Verde | #10B981 | Esmeralda |
| Roxo | #8B5CF6 | Violeta |
| Vermelho | #EF4444 | Vermelho |
| Rosa | #EC4899 | Rosa |
| Laranja | #F97316 | Laranja |
| Ciano | #06B6D4 | Ciano |

## Escopo de impacto
- Aproximadamente 15-20 arquivos precisarão de ajuste de cores hardcoded
- Nenhuma migração de banco necessária (usa campo JSON existente)
- Nenhuma edge function nova necessária
- Compatível com o tema da página pública (que permanece independente)

