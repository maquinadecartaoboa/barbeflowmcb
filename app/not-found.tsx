import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-2">Página não encontrada</h2>
        <p className="text-muted-foreground mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full h-12 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          <Home className="h-4 w-4 mr-2" />
          Ir para a página inicial
        </Link>
      </div>
    </div>
  );
}
