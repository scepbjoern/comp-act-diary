'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { IconSearch, IconX } from '@tabler/icons-react'

// Use separate react-force-graph-2d package to avoid AFRAME dependency from VR/AR components
const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full"><span className="loading loading-spinner loading-lg" /></div>
  }
)

interface Contact {
  id: string
  slug: string
  name: string
  isFavorite: boolean
}

interface Relation {
  id: string
  personAId: string
  personBId: string
  relationType: string
}

interface GraphNode {
  id: string
  name: string
  slug: string
  isFavorite: boolean
  val: number
  x?: number
  y?: number
}

interface GraphData {
  nodes: GraphNode[]
  links: Array<{
    source: string
    target: string
    label: string
  }>
}

interface RelationshipGraphProps {
  contacts: Contact[]
  relations: Relation[]
  focusContactId?: string | null
}

export default function RelationshipGraph({ contacts, relations, focusContactId }: RelationshipGraphProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const hoveredNodeRef = useRef<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Memoize graph data to prevent re-renders
  const graphData: GraphData = useMemo(() => ({
    nodes: contacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      slug: contact.slug,
      isFavorite: contact.isFavorite,
      val: contact.isFavorite ? 3 : 1,
    })),
    links: relations.map(relation => ({
      source: relation.personAId,
      target: relation.personBId,
      label: relation.relationType,
    })),
  }), [contacts, relations])

  // Focus on node when focusContactId changes
  useEffect(() => {
    if (focusContactId && graphRef.current) {
      // Use local graphData instead of calling the graph instance method
      const node = graphData.nodes.find((n: GraphNode) => n.id === focusContactId)
      if (node && typeof node.x === 'number' && typeof node.y === 'number') {
        if (graphRef.current && typeof graphRef.current.centerAt === 'function') {
          graphRef.current.centerAt(node.x, node.y, 1000)
          graphRef.current.zoom(2, 1000)
          setHighlightedNode(focusContactId)
        }
      }
    }
  }, [focusContactId, graphData])

  // Search contacts
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = contacts.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, contacts])

  const focusOnNode = useCallback((contactId: string) => {
    if (graphRef.current) {
      const node = graphData.nodes.find((n: GraphNode) => n.id === contactId)
      if (node) {
        const targetX = node.x ?? 0
        const targetY = node.y ?? 0
        
        if (typeof graphRef.current.centerAt === 'function') {
          graphRef.current.centerAt(targetX, targetY, 1000)
          graphRef.current.zoom(2, 1000)
          setHighlightedNode(contactId)
          setSearchQuery('')
          setShowSearch(false)
          
          // Reset highlight after some time
          setTimeout(() => {
            setHighlightedNode(null)
          }, 5000)
        }
      }
    }
  }, [graphData])

  const handleNodeClick = useCallback((node: { slug?: string }) => {
    if (node.slug) {
      router.push(`/prm/${node.slug}`)
    }
  }, [router])

  const nodeCanvasObject = useCallback((node: { x?: number; y?: number; name?: string; isFavorite?: boolean; id?: string }, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name || ''
    const fontSize = 12 / globalScale
    const isHovered = node.id === hoveredNodeRef.current
    const isHighlighted = node.id === highlightedNode
    const isFavorite = node.isFavorite

    ctx.font = `${fontSize}px Sans-Serif`
    const textWidth = ctx.measureText(label).width
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4)

    // Node circle
    ctx.beginPath()
    const radius = isHighlighted ? 12 : (isFavorite ? 8 : 5)
    ctx.arc(node.x || 0, node.y || 0, radius, 0, 2 * Math.PI)
    ctx.fillStyle = isHighlighted ? '#22c55e' : (isHovered ? '#60a5fa' : (isFavorite ? '#f59e0b' : '#6b7280'))
    ctx.fill()
    
    if (isHighlighted) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    }

    // Background for text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(
      (node.x || 0) - bckgDimensions[0] / 2,
      (node.y || 0) + 10,
      bckgDimensions[0],
      bckgDimensions[1]
    )

    // Text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isHighlighted ? '#22c55e' : (isHovered ? '#60a5fa' : '#ffffff')
    ctx.fillText(label, node.x || 0, (node.y || 0) + 10 + fontSize / 2)
  }, [highlightedNode])

  const linkCanvasObject = useCallback((link: { source?: { x?: number; y?: number }; target?: { x?: number; y?: number }; label?: string }, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source as { x?: number; y?: number } | undefined
    const end = link.target as { x?: number; y?: number } | undefined
    if (!start?.x || !start?.y || !end?.x || !end?.y) return

    // Draw line
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = 'rgba(107, 114, 128, 0.5)'
    ctx.lineWidth = 1 / globalScale
    ctx.stroke()

    // Draw label in middle
    if (link.label && globalScale > 0.5) {
      const midX = (start.x + end.x) / 2
      const midY = (start.y + end.y) / 2
      const fontSize = 10 / globalScale

      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)'
      ctx.fillText(link.label, midX, midY)
    }
  }, [])

  const handleNodeHover = useCallback((node: unknown) => {
    hoveredNodeRef.current = (node as { id?: string })?.id || null
  }, [])

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-lg text-gray-400 mb-4">Keine Kontakte vorhanden</p>
        <p className="text-sm text-gray-500">
          Füge zuerst Kontakte hinzu und erstelle Beziehungen zwischen ihnen.
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px] bg-base-200 rounded-lg overflow-hidden">
      {/* Search Box */}
      <div className="absolute top-4 left-4 z-10">
        {showSearch ? (
          <div className="bg-base-100 rounded-lg shadow-lg p-2 min-w-[280px]">
            <div className="flex items-center gap-2">
              <IconSearch size={18} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kontakt suchen..."
                className="input input-sm input-ghost flex-1 focus:outline-none"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="btn btn-ghost btn-xs">
                <IconX size={16} />
              </button>
            </div>
            {searchResults.length > 0 && (
              <ul className="menu p-0 mt-2 max-h-[200px] overflow-y-auto">
                {searchResults.map(contact => (
                  <li key={contact.id}>
                    <button 
                      className="text-left py-1"
                      onClick={() => focusOnNode(contact.id)}
                    >
                      {contact.name}
                      {contact.isFavorite && <span className="text-warning ml-1">★</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-gray-500 p-2">Kein Kontakt gefunden</p>
            )}
          </div>
        ) : (
          <button 
            onClick={() => setShowSearch(true)}
            className="btn btn-circle btn-sm bg-base-100 shadow-lg"
            title="Kontakt suchen"
          >
            <IconSearch size={18} />
          </button>
        )}
      </div>

      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={nodeCanvasObject as never}
        linkCanvasObject={linkCanvasObject as never}
        onNodeClick={handleNodeClick as never}
        onNodeHover={handleNodeHover as never}
        nodeLabel=""
        linkDirectionalParticles={0}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
    </div>
  )
}
