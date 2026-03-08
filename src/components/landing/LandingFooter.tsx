import logoBranca from "@/assets/modoGESTOR_branca.png";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/5 py-12 px-4 sm:px-6 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8">
        <div>
          <img src={logoBranca} alt="modoGESTOR" className="h-6 mb-3" />
          <p className="text-xs text-zinc-600 leading-relaxed">
            Um produto da MODOPAG FINTECH LTDA
            <br />
            CNPJ: 58.172.447/0001-28
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Links</h4>
          <div className="flex flex-col gap-2">
            <a href="/termos-de-uso" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Termos de Uso
            </a>
            <a href="/politica-de-privacidade" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Política de Privacidade
            </a>
            <a href="/politica-de-reembolso" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Política de Reembolso
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Contato</h4>
          <div className="flex flex-col gap-2 text-sm text-zinc-500">
            <p>contato@modogestor.com.br</p>
            <p>(75) 99205-0743</p>
            <p>Feira de Santana — BA</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
