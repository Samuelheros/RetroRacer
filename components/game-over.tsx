"use client"

import { Button } from "@/components/ui/button"
import { Trophy } from "lucide-react"

interface GameOverProps {
  score: number
  highScore: number
  onRetry: () => void
  onMenu: () => void
}

export default function GameOver({ score, highScore, onRetry, onMenu }: GameOverProps) {
  const isNewHighScore = score >= highScore

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-8">GAME OVER</h1>

      <div className="text-2xl md:text-3xl mb-4">
        Your Score: <span className="text-yellow-400">{score}</span>
      </div>

      <div className="text-xl md:text-2xl mb-8">
        High Score: <span className="text-yellow-400">{highScore}</span>
      </div>

      {isNewHighScore && (
        <div className="flex items-center gap-2 text-2xl text-yellow-400 mb-8 animate-pulse">
          <Trophy className="w-6 h-6" />
          <span>New High Score!</span>
          <Trophy className="w-6 h-6" />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <Button onClick={onRetry} size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8">
          Try Again
        </Button>

        <Button onClick={onMenu} size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
          Main Menu
        </Button>
      </div>
    </div>
  )
}
