import { SendForm } from '@/components/SendForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500/10 to-teal-500/10 border border-sky-500/20 rounded-full mb-4">
            <span className="text-sm text-sky-400">Powered by Self Protocol</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-400 to-teal-400 text-transparent bg-clip-text mb-2">
            Email Remittance
          </h1>
          <p className="text-gray-400">
            Send crypto to anyone with just their email address
          </p>
        </div>

        {/* Send Form */}
        <SendForm />

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Supports Celo • Base • Monad</p>
        </div>
      </div>
    </main>
  );
}
