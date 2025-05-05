"use client"

import { Button } from "@/components/ui/button"
import { Car } from "lucide-react"

interface GameMenuProps {
  onStartGame: () => void
  highScore: number
}

export default function GameMenu({ onStartGame, highScore }: GameMenuProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-black text-white p-4">
      <div className="flex items-center gap-2 mb-4">
        <Car className="w-8 h-8" />
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">RETRO RACER</h1>
      </div>

      <div className="text-xl md:text-2xl mb-8 text-center">
        <p>Dodge obstacles and survive as long as possible!</p>
        <p className="text-yellow-400 mt-2">High Score: {highScore}</p>
      </div>

      <div className="space-y-4 text-center">
        <Button onClick={onStartGame} size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-xl">
          START GAME
        </Button>

        <div className="mt-8 text-sm md:text-base max-w-md mx-auto">
          <h2 className="font-bold text-lg mb-2">How to Play:</h2>
          <p className="mb-2">Use the arrow keys or A/D keys to move left and right.</p>
          <p className="mb-2">On mobile, swipe left or right to control the car.</p>
          <p>Avoid obstacles to earn points and survive!</p>
        </div>
      </div>
    </div>
  )
}
