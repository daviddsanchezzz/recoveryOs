import Link from 'next/link';
import { Panel } from '../components/ui/card';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <Panel className="space-y-6 rounded-[36px] bg-white/80">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-moss">RecoveryOS</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink">
            Primero crea tu cuenta. Despues entramos en tu panel diario.
          </h1>
          <p className="mt-4 text-base leading-7 text-ink/72">
            Si la vas a usar sobre todo como PWA en movil, la experiencia debe abrir directamente
            sobre tu sesion, tu dashboard y tu chat.
          </p>
        </div>
        <div className="grid gap-3">
          <Link
            href="/register"
            className="rounded-full bg-ink px-5 py-4 text-center text-sm font-medium text-white"
          >
            Crear mi usuario
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-black/10 bg-white px-5 py-4 text-center text-sm font-medium text-ink"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <div className="rounded-3xl bg-canvas px-4 py-4 text-sm leading-7 text-ink/78">
          El objetivo ahora no es una landing, sino una app personal de uso diario.
        </div>
      </Panel>
    </main>
  );
}

