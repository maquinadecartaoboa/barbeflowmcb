

# Automatizar Domínios Personalizados via API do Vercel

## Problema Atual
Quando um tenant do plano Profissional adiciona um domínio personalizado:
1. O Cloudflare registra o custom hostname corretamente
2. O DNS do cliente aponta para o Cloudflare
3. O Cloudflare tenta fazer proxy para o origin (`app.modogestor.com.br` no Vercel)
4. **O Vercel rejeita** porque o domínio customizado nao esta cadastrado la -- **passo manual necessario**

## Solucao

Integrar a **API do Vercel** nas edge functions para que, ao adicionar/remover um dominio, o Vercel tambem seja configurado automaticamente.

```text
Fluxo automatizado:

Usuario adiciona dominio
        |
        v
Edge Function "add-custom-domain"
        |
        +---> 1. Cloudflare: registra custom hostname
        +---> 2. Vercel API: adiciona dominio ao projeto
        +---> 3. DB: salva status
        |
        v
Dominio funcionando automaticamente
```

## Pre-requisito: Secrets

Duas novas secrets precisam ser configuradas:

| Secret | Onde obter |
|--------|-----------|
| `VERCEL_API_TOKEN` | Vercel Dashboard > Settings > Tokens > Create |
| `VERCEL_PROJECT_ID` | Vercel Dashboard > Project Settings > General > Project ID |

## Alteracoes Tecnicas

### 1. Edge Function `add-custom-domain/index.ts`

Apos registrar o dominio no Cloudflare com sucesso, adicionar uma chamada a API do Vercel:

```typescript
// Apos o registro no Cloudflare, adicionar no Vercel
const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");

if (vercelToken && vercelProjectId) {
  const vercelRes = await fetch(
    `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: cleanDomain }),
    }
  );
  const vercelData = await vercelRes.json();
  if (!vercelRes.ok) {
    console.error("Vercel domain error:", JSON.stringify(vercelData));
    // Nao bloqueia o fluxo, apenas loga o erro
  }
}
```

### 2. Edge Function `remove-custom-domain/index.ts`

Ao remover o dominio, tambem remover do Vercel:

```typescript
// Apos deletar do Cloudflare, remover do Vercel
const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");

if (vercelToken && vercelProjectId && tenant?.custom_domain) {
  await fetch(
    `https://api.vercel.com/v10/projects/${vercelProjectId}/domains/${tenant.custom_domain}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${vercelToken}` },
    }
  );
}
```

### 3. Buscar `custom_domain` antes de deletar

Na funcao `remove-custom-domain`, a query atual so busca `cloudflare_hostname_id`. Precisa tambem buscar `custom_domain` para poder remover do Vercel:

```typescript
// Mudar de:
.select("cloudflare_hostname_id")
// Para:
.select("cloudflare_hostname_id, custom_domain")
```

## Resultado Final

- **Zero intervencao manual**: quando o usuario conectar um dominio, tudo funciona automaticamente (Cloudflare + Vercel)
- **Remocao limpa**: ao remover, ambos os servicos sao limpos
- **Resiliente**: se a chamada ao Vercel falhar, o fluxo do Cloudflare nao e bloqueado (apenas logado)

## Proximo Passo

Antes de implementar, preciso que voce configure as duas secrets:
- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID`

