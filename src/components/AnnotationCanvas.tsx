'use client'

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { Tool } from './Toolbar'

// Tipos mínimos para interop com Fabric.js (importado dinamicamente)
type FabricCanvas = {
  isDrawingMode: boolean
  selection: boolean
  freeDrawingBrush: { color: string; width: number }
  getObjects: () => FabricObject[]
  getActiveObject: () => FabricObject | null
  setActiveObject: (obj: FabricObject) => void
  remove: (obj: FabricObject) => void
  add: (obj: FabricObject) => void
  renderAll: () => void
  dispose: () => void
  on: (event: string, handler: (e?: FabricEvent) => void) => void
  off: (event: string, handler?: (e?: FabricEvent) => void) => void
  toJSON: () => object
  setWidth: (w: number) => void
  setHeight: (h: number) => void
}

type FabricObject = {
  toObject: () => object
  type?: string
  set: (opts: Record<string, unknown>) => void
  setCoords: () => void
}

type FabricEvent = {
  pointer?: { x: number; y: number }
  target?: FabricObject
}

export type AnnotationCanvasHandle = {
  undo: () => void
  clear: () => void
  getAnnotationsJSON: () => object[]
  getMergedImage: () => Promise<string | null>
}

interface AnnotationCanvasProps {
  screenshotUrl: string
  activeTool: Tool
  onAnnotationsChange: (count: number) => void
}

const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas({ screenshotUrl, activeTool, onAnnotationsChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasElRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<FabricCanvas | null>(null)
    const activeToolRef = useRef<Tool>(activeTool)
    const isDrawingArrowRef = useRef(false)
    const arrowStartRef = useRef<{ x: number; y: number } | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arrowLineRef = useRef<any>(null)

    // Mantém ref sincronizada sem re-criar handlers
    useEffect(() => {
      activeToolRef.current = activeTool
    }, [activeTool])

    const notifyChange = useCallback(
      (canvas: FabricCanvas) => {
        onAnnotationsChange(canvas.getObjects().length)
      },
      [onAnnotationsChange]
    )

    // Inicializa Fabric.js após imagem carregar
    const handleImageLoad = useCallback(async () => {
      const container = containerRef.current
      const canvasEl = canvasElRef.current
      if (!container || !canvasEl) return

      const img = container.querySelector('img')
      if (!img) return

      const W = img.offsetWidth
      const H = img.offsetHeight

      canvasEl.width = W
      canvasEl.height = H

      // Importação dinâmica (Fabric.js é client-only e pesado)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fabric = (await import('fabric')) as any

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const canvas: FabricCanvas = new fabric.Canvas(canvasEl, {
        width: W,
        height: H,
        isDrawingMode: false,
        selection: true,
        backgroundColor: 'transparent',
      })

      canvas.freeDrawingBrush.color = '#e11d48'
      canvas.freeDrawingBrush.width = 3

      fabricRef.current = canvas

      // --- Handler: mouse:down ---
      const onMouseDown = (e?: FabricEvent) => {
        const tool = activeToolRef.current
        if (tool === 'eraser') {
          const target = e?.target
          if (target) {
            canvas.remove(target)
            notifyChange(canvas)
          }
          return
        }

        if (tool === 'textbox') {
          const ptr = e?.pointer
          if (!ptr) return
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const tb = new fabric.Textbox('Clique para editar', {
            left: ptr.x,
            top: ptr.y,
            width: 200,
            fontSize: 16,
            fill: '#1d4ed8',
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderColor: '#1d4ed8',
            cornerColor: '#1d4ed8',
            padding: 6,
          })
          canvas.add(tb)
          canvas.setActiveObject(tb)
          notifyChange(canvas)
          return
        }

        if (tool === 'arrow') {
          const ptr = e?.pointer
          if (!ptr) return
          isDrawingArrowRef.current = true
          arrowStartRef.current = { x: ptr.x, y: ptr.y }

          // Linha temporária
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const line = new fabric.Line([ptr.x, ptr.y, ptr.x, ptr.y], {
            stroke: '#e11d48',
            strokeWidth: 3,
            selectable: false,
            evented: false,
          })
          arrowLineRef.current = line
          canvas.add(line)
          return
        }
      }

      // --- Handler: mouse:move ---
      const onMouseMove = (e?: FabricEvent) => {
        if (!isDrawingArrowRef.current || !arrowLineRef.current) return
        const ptr = e?.pointer
        if (!ptr) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const line = arrowLineRef.current as any
        line.set({ x2: ptr.x, y2: ptr.y })
        canvas.renderAll()
      }

      // --- Handler: mouse:up ---
      const onMouseUp = async (e?: FabricEvent) => {
        if (!isDrawingArrowRef.current) return
        isDrawingArrowRef.current = false

        const start = arrowStartRef.current
        const ptr = e?.pointer
        if (!start || !ptr) return

        // Remove linha temporária
        if (arrowLineRef.current) {
          canvas.remove(arrowLineRef.current as FabricObject)
          arrowLineRef.current = null
        }

        const dx = ptr.x - start.x
        const dy = ptr.y - start.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 10) return // clique sem arrastar, ignora

        // Cria grupo seta (linha + triângulo na ponta)
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const line = new fabric.Line([0, 0, len, 0], {
          stroke: '#e11d48',
          strokeWidth: 3,
          originX: 'left',
          originY: 'center',
        })

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const triangle = new fabric.Triangle({
          width: 14,
          height: 14,
          fill: '#e11d48',
          left: len,
          top: 0,
          originX: 'center',
          originY: 'center',
          angle: 90,
        })

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const group = new fabric.Group([line, triangle], {
          left: start.x,
          top: start.y,
          angle,
          originX: 'left',
          originY: 'center',
        })

        canvas.add(group)
        notifyChange(canvas)
      }

      canvas.on('mouse:down', onMouseDown)
      canvas.on('mouse:move', onMouseMove)
      canvas.on('mouse:up', onMouseUp)
      canvas.on('object:added', () => notifyChange(canvas))
      canvas.on('object:removed', () => notifyChange(canvas))
    }, [notifyChange])

    // Atualiza modo de desenho quando ferramenta muda
    useEffect(() => {
      const canvas = fabricRef.current
      if (!canvas) return

      canvas.isDrawingMode = activeTool === 'drawing'
      canvas.selection = activeTool === 'select'
    }, [activeTool])

    // Expõe métodos para o componente pai
    useImperativeHandle(
      ref,
      () => ({
        undo() {
          const canvas = fabricRef.current
          if (!canvas) return
          const objects = canvas.getObjects()
          const last = objects[objects.length - 1]
          if (last) {
            canvas.remove(last)
            notifyChange(canvas)
          }
        },
        clear() {
          const canvas = fabricRef.current
          if (!canvas) return
          canvas.getObjects().forEach((obj) => canvas.remove(obj))
          notifyChange(canvas)
        },
        getAnnotationsJSON() {
          const canvas = fabricRef.current
          if (!canvas) return []
          return canvas.getObjects().map((obj) => obj.toObject())
        },
        async getMergedImage() {
          const container = containerRef.current
          const canvasEl = canvasElRef.current
          if (!container || !canvasEl) return null

          const img = container.querySelector('img')
          if (!img) return null

          // Cria canvas temporário com as dimensões reais da imagem
          const offscreen = document.createElement('canvas')
          offscreen.width = img.naturalWidth
          offscreen.height = img.naturalHeight

          const ctx = offscreen.getContext('2d')
          if (!ctx) return null

          // Desenha a imagem de fundo
          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)

          // Escala para sobrepor as anotações do Fabric (que operam no tamanho exibido)
          const scaleX = img.naturalWidth / img.offsetWidth
          const scaleY = img.naturalHeight / img.offsetHeight
          ctx.scale(scaleX, scaleY)

          // Renderiza o canvas do Fabric sobre a imagem
          ctx.drawImage(canvasEl, 0, 0)

          return offscreen.toDataURL('image/jpeg', 0.92)
        },
      }),
      [notifyChange]
    )

    // Cleanup
    useEffect(() => {
      return () => {
        fabricRef.current?.dispose()
        fabricRef.current = null
      }
    }, [])

    return (
      <div ref={containerRef} className="relative w-full select-none">
        <img
          src={screenshotUrl}
          alt="Preview da landing page"
          className="block w-full pointer-events-none"
          draggable={false}
          onLoad={handleImageLoad}
        />
        <canvas
          ref={canvasElRef}
          className="absolute top-0 left-0"
          style={{ cursor: activeTool === 'eraser' ? 'not-allowed' : activeTool === 'select' ? 'default' : 'crosshair' }}
        />
      </div>
    )
  }
)

export default AnnotationCanvas
