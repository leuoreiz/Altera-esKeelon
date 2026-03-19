import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { reviewSessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import ScreenshotLoader from './ScreenshotLoader'

interface ReviewPageProps {
  params: Promise<{ token: string }>
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { token } = await params

  // Valida formato UUID básico antes de bater no banco
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) notFound()

  const session = await db.query.reviewSessions.findFirst({
    where: eq(reviewSessions.token, token),
  })

  if (!session) notFound()

  if (session.status === 'submitted' || session.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Revisão já enviada</h2>
          <p className="text-gray-500">Esta sessão de revisão já foi concluída.</p>
        </div>
      </div>
    )
  }

  return (
    <ScreenshotLoader
      token={session.token}
      projectName={session.projectName}
      projectLink={session.projectLink}
    />
  )
}
