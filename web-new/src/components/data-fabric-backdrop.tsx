/**
 * DataFabricBackdrop — a decorative, animated "AI operations" network visual
 * for the hero. It evokes the DutaOS concept mockups (a glowing teal→emerald
 * data-fabric over a receding grid) without asserting anything factual: there
 * are no numbers, no client names, no topology claims. It is aria-hidden and
 * purely ornamental, and every animation is disabled under reduced-motion.
 */

// Fixed coordinates keep the render deterministic (no per-load randomness).
const NODES = [
  { x: 120, y: 300 }, { x: 250, y: 170 }, { x: 300, y: 430 }, { x: 430, y: 300 },
  { x: 520, y: 140 }, { x: 560, y: 470 }, { x: 650, y: 300 }, { x: 730, y: 200 },
  { x: 770, y: 430 }, { x: 870, y: 320 }, { x: 900, y: 170 }, { x: 930, y: 470 },
]

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6],
  [6, 7], [6, 8], [7, 10], [8, 11], [7, 9], [8, 9], [9, 10], [2, 5], [1, 4],
]

export function DataFabricBackdrop() {
  return (
    <div className="df-backdrop" aria-hidden="true">
      {/* receding perspective grid floor */}
      <div className="df-floor" />

      <svg
        className="df-mesh"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="dfEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="dfNode" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* base edges */}
        {EDGES.map(([a, b], i) => (
          <line
            key={`e${i}`}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke="url(#dfEdge)"
            strokeWidth={1}
            strokeOpacity={0.28}
          />
        ))}

        {/* traveling data pulses on a subset of edges */}
        {EDGES.filter((_, i) => i % 2 === 0).map(([a, b], i) => (
          <line
            key={`f${i}`}
            className="df-flow"
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke="url(#dfEdge)"
            strokeWidth={1.6}
            strokeLinecap="round"
            style={{ animationDelay: `${(i % 6) * 0.5}s` }}
          />
        ))}

        {/* nodes: soft halo + bright core */}
        {NODES.map((n, i) => (
          <g key={`n${i}`}>
            <circle cx={n.x} cy={n.y} r={16} fill="url(#dfNode)" opacity={0.5} />
            <circle
              className="df-node"
              cx={n.x}
              cy={n.y}
              r={3.5}
              fill="#5eead4"
              style={{ animationDelay: `${(i % 5) * 0.4}s` }}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
