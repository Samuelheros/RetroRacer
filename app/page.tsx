"use client"

import { useEffect, useState } from "react"
import RetroCarGame from "@/components/retro-car-game"
import GameMenu from "@/components/game-menu"
import GameHUD from "@/components/game-hud"
import GameOver from "@/components/game-over"

export default function Home() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)

  useEffect(() => {
    // Load high score from localStorage
    const savedHighScore = localStorage.getItem("retroCarHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }
  }, [])

  const handleStartGame = () => {
    setScore(0)
    setGameState("playing")
  }

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore)

    // Update high score if needed
    if (finalScore > highScore) {
      setHighScore(finalScore)
      localStorage.setItem("retroCarHighScore", finalScore.toString())
    }

    setGameState("gameOver")
  }

  const handleReturnToMenu = () => {
    setGameState("menu")
  }

  return (
    <main className="w-full h-screen overflow-hidden bg-black relative">
      {gameState === "menu" && <GameMenu onStartGame={handleStartGame} highScore={highScore} />}

      {gameState === "playing" && (
        <>
          <RetroCarGame onGameOver={handleGameOver} onScoreUpdate={setScore} />
          <GameHUD score={score} />
        </>
      )}

      {gameState === "gameOver" && (
        <GameOver score={score} highScore={highScore} onRetry={handleStartGame} onMenu={handleReturnToMenu} />
      )}
    </main>
  )
}
