import { useEffect, useRef } from 'react'

const BARS = 24

/** VU meter a barre: mostra il livello corrente con una piccola scia. */
export default function LevelMeter({ level }: { level: number }) {
  const history = useRef<number[]>(Array(BARS).fill(0))

  useEffect(() => {
    history.current = [...history.current.slice(1), level]
  }, [level])

  return (
    <div className="vu" aria-hidden>
      {history.current.map((v, i) => (
        <span key={i} style={{ height: `${Math.max(6, v * 100)}%` }} />
      ))}
    </div>
  )
}
