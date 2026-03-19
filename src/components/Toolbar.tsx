'use client'

export type Tool = 'select' | 'drawing' | 'arrow' | 'textbox' | 'eraser'

interface ToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  onUndo: () => void
  onClear: () => void
  onSubmit: () => void
  isSubmitting: boolean
  annotationCount: number
}

const tools: Array<{ id: Tool; label: string; icon: string }> = [
  { id: 'select',  label: 'Selecionar', icon: '↖' },
  { id: 'drawing', label: 'Desenho',    icon: '✏' },
  { id: 'arrow',   label: 'Seta',       icon: '→' },
  { id: 'textbox', label: 'Texto',      icon: 'T' },
  { id: 'eraser',  label: 'Borracha',   icon: '⌫' },
]

export default function Toolbar({
  activeTool,
  onToolChange,
  onUndo,
  onClear,
  onSubmit,
  isSubmitting,
  annotationCount,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <span className="text-sm font-semibold text-gray-500 mr-2">Ferramentas:</span>

      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTool === tool.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={tool.label}
        >
          {tool.icon} {tool.label}
        </button>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onUndo}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          title="Desfazer última ação"
        >
          ↩ Desfazer
        </button>
        <button
          onClick={onClear}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          title="Limpar todas as anotações"
        >
          🗑 Limpar
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting || annotationCount === 0}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Enviar anotações"
        >
          {isSubmitting ? 'Enviando...' : `Enviar alterações${annotationCount > 0 ? ` (${annotationCount})` : ''}`}
        </button>
      </div>
    </div>
  )
}
