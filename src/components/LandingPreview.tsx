'use client'

// Componente de preview da landing page com canvas de anotações sobreposto

interface LandingPreviewProps {
  screenshotUrl: string
  onCanvasReady: (canvas: HTMLCanvasElement) => void
}

export default function LandingPreview({
  screenshotUrl,
  onCanvasReady,
}: LandingPreviewProps) {
  return (
    <div className="relative w-full overflow-auto border border-gray-300 rounded-lg bg-white">
      {/* Imagem da landing page */}
      <img
        src={screenshotUrl}
        alt="Preview da landing page"
        className="block w-full"
        draggable={false}
      />

      {/* Canvas de anotações — posicionado sobre a imagem */}
      <canvas
        ref={(el) => {
          if (el) onCanvasReady(el)
        }}
        className="absolute top-0 left-0 w-full h-full"
        style={{ cursor: 'crosshair' }}
      />
    </div>
  )
}
