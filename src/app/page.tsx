// Página inicial — redireciona para criação de nova sessão ou exibe instruções
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Sistema de Revisão de Landing Pages
        </h1>
        <p className="text-gray-500 text-sm">
          Acesse o link de revisão enviado pela equipe para começar a anotar sua landing page.
        </p>
      </div>
    </main>
  )
}
