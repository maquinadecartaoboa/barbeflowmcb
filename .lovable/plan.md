

## Remover mencao ao Mercado Pago no checkout de servicos

### O que muda

Substituir o badge "Pagamento seguro via Mercado Pago" (4 ocorrencias) no `MercadoPagoCheckout.tsx` pelo mesmo estilo usado na aba de assinaturas (`SubscriptionCardPayment.tsx`).

### De (atual)

```
<svg shield-icon />
<span>Pagamento seguro via Mercado Pago</span>
```

### Para (novo - mesmo padrao da assinatura)

```
<div className="flex items-center justify-center gap-4 pt-1">
  <div className="flex items-center gap-1.5 text-muted-foreground/60">
    <Lock className="h-3 w-3" />
    <span className="text-[11px]">Criptografado</span>
  </div>
  <div className="w-px h-3 bg-border" />
  <div className="flex items-center gap-1.5 text-muted-foreground/60">
    <Shield className="h-3 w-3" />
    <span className="text-[11px]">Pagamento seguro</span>
  </div>
</div>
```

### Locais alterados (4 ocorrencias no mesmo arquivo)

| Arquivo | Linhas | Contexto |
|---|---|---|
| `src/components/MercadoPagoCheckout.tsx` | ~532-538 | Checkout redirect |
| `src/components/MercadoPagoCheckout.tsx` | ~576-582 | Selecao de metodo (cartao/PIX) |
| `src/components/MercadoPagoCheckout.tsx` | ~645-651 | Tela PIX (QR code) |
| `src/components/MercadoPagoCheckout.tsx` | ~710-716 | Formulario de cartao |

Tambem sera necessario adicionar `Lock` e `Shield` aos imports do lucide-react (ja importados parcialmente).

### Texto do botao de redirect

A linha 530 "Pagar com Mercado Pago" sera alterada para "Pagar agora" e a linha 520 "Voce sera redirecionado para o Mercado Pago..." sera alterada para "Voce sera redirecionado para concluir o pagamento."

### Resumo

- 4 badges substituidos pelo padrao visual da assinatura
- 2 textos que mencionam "Mercado Pago" atualizados
- Import de `Lock` e `Shield` adicionado
- Nenhuma alteracao de logica ou backend

