import { Gauge } from "lucide-react"

interface GameHUDProps {
  score: number
}

export default function GameHUD({ score }: GameHUDProps) {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white pointer-events-none">
      <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg">
        <div className="text-xl font-bold">Score: {score}</div>
      </div>

      <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg flex items-center gap-2">
        <Gauge className="w-5 h-5" />
        <div className="text-xl font-bold">Speed: {Math.floor(100 + score / 50)}mph</div>
      </div>
    </div>
  )
}
