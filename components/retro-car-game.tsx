"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { useFrame, Canvas } from "@react-three/fiber"
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier"
import { Environment, PerspectiveCamera, Sky, Stars, OrbitControls } from "@react-three/drei"
import { Howl } from "howler"
import { useMobile } from "@/hooks/use-mobile"

// Sound effects
const sounds = {
  engine: new Howl({
    src: ["/sounds/engine.mp3"],
    loop: true,
    volume: 0.3,
  }),
  crash: new Howl({
    src: ["/sounds/crash.mp3"],
    volume: 0.5,
  }),
  score: new Howl({
    src: ["/sounds/score.mp3"],
    volume: 0.3,
  }),
  music: new Howl({
    src: ["/sounds/music.mp3"],
    loop: true,
    volume: 0.2,
  }),
}

// Game constants
const ROAD_WIDTH = 10
const ROAD_LENGTH = 200
const LANE_COUNT = 3
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT
const OBSTACLE_TYPES = ["cube", "cylinder", "cone"]
const OBSTACLE_COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]
const INITIAL_OBSTACLE_SPEED = 0.5
const SPEED_INCREASE_THRESHOLD = 5
const SPEED_INCREASE_AMOUNT = 0.1
const OBSTACLE_GENERATE_INTERVAL = 1500
const CAR_SPEED = 0.15

interface RetroCarGameProps {
  onGameOver: (score: number) => void
  onScoreUpdate: (score: number) => void
}

export default function RetroCarGame({ onGameOver, onScoreUpdate }: RetroCarGameProps) {
  const isMobile = useMobile()

  useEffect(() => {
    // Start background music
    sounds.music.play()
    sounds.engine.play()

    return () => {
      // Clean up sounds when component unmounts
      sounds.music.stop()
      sounds.engine.stop()
    }
  }, [])

  return (
    <Canvas shadows>
      <Sky sunPosition={[100, 10, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[0, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <fog attach="fog" args={["#87CEEB", 30, 150]} />

      <Physics debug={false}>
        <GameScene onGameOver={onGameOver} onScoreUpdate={onScoreUpdate} isMobile={isMobile} />
      </Physics>
    </Canvas>
  )
}

interface GameSceneProps {
  onGameOver: (score: number) => void
  onScoreUpdate: (score: number) => void
  isMobile: boolean
}

function GameScene({ onGameOver, onScoreUpdate, isMobile }: GameSceneProps) {
  // Game state
  const [gameSpeed, setGameSpeed] = useState(1)
  const [score, setScore] = useState(0)
  const [dodgeCount, setDodgeCount] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)

  // References
  const carRef = useRef<THREE.Group>(null)
  const carBodyRef = useRef<THREE.Mesh>(null)
  const obstaclesRef = useRef<THREE.Group[]>([])
  const roadRef = useRef<THREE.Mesh>(null)
  const lastObstacleTimeRef = useRef(0)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  // Controls
  const [moveLeft, setMoveLeft] = useState(false)
  const [moveRight, setMoveRight] = useState(false)

  // Touch controls for mobile
  const [touchStartX, setTouchStartX] = useState(0)

  // Create a fallback road texture
  const [roadTexture, setRoadTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    // Create a simple road texture programmatically
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext("2d")

    if (ctx) {
      // Draw road background
      ctx.fillStyle = "#555555"
      ctx.fillRect(0, 0, 512, 512)

      // Draw center line
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 10
      ctx.setLineDash([40, 20])
      ctx.beginPath()
      ctx.moveTo(256, 0)
      ctx.lineTo(256, 512)
      ctx.stroke()

      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(1, 20)
      setRoadTexture(texture)
    }
  }, [])

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        setMoveLeft(true)
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        setMoveRight(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        setMoveLeft(false)
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        setMoveRight(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [isGameOver])

  // Handle touch controls for mobile
  useEffect(() => {
    if (!isMobile) return

    const handleTouchStart = (e: TouchEvent) => {
      if (isGameOver) return
      setTouchStartX(e.touches[0].clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isGameOver || !touchStartX) return

      const touchX = e.touches[0].clientX
      const diff = touchX - touchStartX

      if (diff < -20) {
        setMoveLeft(true)
        setMoveRight(false)
      } else if (diff > 20) {
        setMoveLeft(false)
        setMoveRight(true)
      } else {
        setMoveLeft(false)
        setMoveRight(false)
      }
    }

    const handleTouchEnd = () => {
      setMoveLeft(false)
      setMoveRight(false)
    }

    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchmove", handleTouchMove)
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isMobile, isGameOver, touchStartX])

  // Create a new obstacle
  const createObstacle = () => {
    if (isGameOver) return

    // Choose random obstacle type and color
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)]
    const color = OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)]

    // Choose random lane
    const lane = Math.floor(Math.random() * LANE_COUNT)
    const laneX = (lane - 1) * LANE_WIDTH

    // Create obstacle group
    const obstacleGroup = new THREE.Group()
    obstacleGroup.position.set(laneX, 0.75, -150)
    obstacleGroup.userData = { passed: false, type }

    // Create obstacle mesh based on type
    let obstacleMesh

    if (type === "cube") {
      const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5)
      const material = new THREE.MeshPhongMaterial({ color })
      obstacleMesh = new THREE.Mesh(geometry, material)
    } else if (type === "cylinder") {
      const geometry = new THREE.CylinderGeometry(0.75, 0.75, 1.5, 16)
      const material = new THREE.MeshPhongMaterial({ color })
      obstacleMesh = new THREE.Mesh(geometry, material)
    } else if (type === "cone") {
      const geometry = new THREE.ConeGeometry(0.75, 1.5, 16)
      const material = new THREE.MeshPhongMaterial({ color })
      obstacleMesh = new THREE.Mesh(geometry, material)
    }

    if (obstacleMesh) {
      obstacleMesh.castShadow = true
      obstacleMesh.receiveShadow = true
      obstacleGroup.add(obstacleMesh)

      // Add to scene and obstacles array
      obstaclesRef.current.push(obstacleGroup)
      return obstacleGroup
    }

    return null
  }

  // Handle game over
  const handleGameOver = () => {
    if (isGameOver) return

    setIsGameOver(true)
    sounds.engine.stop()
    sounds.crash.play()

    // Notify parent component
    onGameOver(score)
  }

  // Game loop
  useFrame((state, delta) => {
    if (isGameOver) return

    // Update score in parent component
    onScoreUpdate(score)

    // Move car based on controls
    if (carRef.current) {
      if (moveLeft) {
        carRef.current.position.x -= CAR_SPEED * gameSpeed
        // Limit movement to stay on road
        if (carRef.current.position.x < -ROAD_WIDTH / 2 + 1) {
          carRef.current.position.x = -ROAD_WIDTH / 2 + 1
        }
      }

      if (moveRight) {
        carRef.current.position.x += CAR_SPEED * gameSpeed
        // Limit movement to stay on road
        if (carRef.current.position.x > ROAD_WIDTH / 2 - 1) {
          carRef.current.position.x = ROAD_WIDTH / 2 - 1
        }
      }

      // Add slight tilt when turning
      if (moveLeft && !moveRight) {
        carRef.current.rotation.z = THREE.MathUtils.lerp(carRef.current.rotation.z, 0.1, 0.1)
      } else if (moveRight && !moveLeft) {
        carRef.current.rotation.z = THREE.MathUtils.lerp(carRef.current.rotation.z, -0.1, 0.1)
      } else {
        carRef.current.rotation.z = THREE.MathUtils.lerp(carRef.current.rotation.z, 0, 0.1)
      }
    }

    // Update camera position to follow car
    if (cameraRef.current && carRef.current) {
      // Position camera above and behind the car
      cameraRef.current.position.x = carRef.current.position.x
      cameraRef.current.position.y = 7
      cameraRef.current.position.z = carRef.current.position.z + 10

      // Make camera look at the car
      cameraRef.current.lookAt(
        carRef.current.position.x,
        carRef.current.position.y + 1,
        carRef.current.position.z
      )
    }

    // Animate road texture scrolling
    if (roadRef.current && roadRef.current.material instanceof THREE.MeshStandardMaterial && roadTexture) {
      roadTexture.offset.y -= 0.02 * gameSpeed * delta * 60
    }

    // Generate new obstacles
    const now = state.clock.getElapsedTime() * 1000
    if (now - lastObstacleTimeRef.current > OBSTACLE_GENERATE_INTERVAL / gameSpeed) {
      const obstacle = createObstacle()
      if (obstacle) {
        state.scene.add(obstacle)
      }
      lastObstacleTimeRef.current = now
    }

    // Update obstacles
    const carPosition = carRef.current?.position || new THREE.Vector3()
    const carBox = new THREE.Box3().setFromObject(carRef.current)

    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obstacle = obstaclesRef.current[i]

      // Move obstacle toward player
      obstacle.position.z += INITIAL_OBSTACLE_SPEED * gameSpeed * delta * 60

      // Check for collision
      const obstacleBox = new THREE.Box3().setFromObject(obstacle)

      if (carBox.intersectsBox(obstacleBox)) {
        handleGameOver()
        break
      }

      // Check if obstacle was passed
      if (obstacle.position.z > carPosition.z + 1 && !obstacle.userData.passed) {
        obstacle.userData.passed = true

        // Update score
        setScore((prevScore) => prevScore + 10)
        setDodgeCount((prevCount) => prevCount + 1)

        // Play score sound
        sounds.score.play()

        // Increase game speed after certain number of dodges
        if (dodgeCount > 0 && (dodgeCount + 1) % SPEED_INCREASE_THRESHOLD === 0) {
          setGameSpeed((prevSpeed) => prevSpeed + SPEED_INCREASE_AMOUNT)

          // Adjust engine sound pitch with speed
          sounds.engine.rate(1 + (gameSpeed - 1) * 0.5)
        }
      }

      // Remove obstacles that are far behind
      if (obstacle.position.z > carPosition.z + 20) {
        state.scene.remove(obstacle)
        obstaclesRef.current.splice(i, 1)
      }
    }
  })

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera 
        ref={cameraRef} 
        makeDefault 
        position={[0, 7, 15]} 
        fov={60} 
        near={0.1} 
        far={1000} 
      />

      {/* Road */}
      <mesh ref={roadRef} rotation-x={-Math.PI / 2} position={[0, 0, -ROAD_LENGTH / 2]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        {roadTexture ? (
          <meshStandardMaterial map={roadTexture} roughness={0.8} />
        ) : (
          <meshStandardMaterial color="#555555" roughness={0.8} />
        )}
      </mesh>

      {/* Road boundaries */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.5, 1, ROAD_LENGTH / 2]} position={[-ROAD_WIDTH / 2 - 0.5, 1, -ROAD_LENGTH / 2]} />
        <CuboidCollider args={[0.5, 1, ROAD_LENGTH / 2]} position={[ROAD_WIDTH / 2 + 0.5, 1, -ROAD_LENGTH / 2]} />
      </RigidBody>

      {/* Car */}
      <group ref={carRef} position={[0, 0.5, 5]}>
        <RigidBody type="fixed" colliders="cuboid" ref={carBodyRef}>
          <RetroCar />
        </RigidBody>
      </group>

      {/* Environment elements */}
      <Environment preset="sunset" />

      {/* Scenery - Trees and rocks along the road */}
      <Scenery />
    </>
  )
}

function Scenery() {
  // Create trees and rocks along the road
  const items = []
  const treeCount = 40

  for (let i = 0; i < treeCount; i++) {
    // Alternate between left and right side of the road
    const side = i % 2 === 0 ? -1 : 1
    const distance = Math.random() * 5 + 8 // Distance from road center
    const zPos = -i * 10 - 20 // Space trees along the road

    // Add tree
    items.push(
      <Tree
        key={`tree-${i}`}
        position={[side * distance, 0, zPos]}
        scale={[0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4]}
      />,
    )

    // Add rock on opposite side occasionally
    if (Math.random() > 0.7) {
      items.push(
        <Rock
          key={`rock-${i}`}
          position={[-side * (distance - 3), 0, zPos + Math.random() * 5]}
          scale={[0.5 + Math.random() * 0.3, 0.5 + Math.random() * 0.3, 0.5 + Math.random() * 0.3]}
        />,
      )
    }
  }

  return <>{items}</>
}

function Tree({ position, scale }: { position: [number, number, number]; scale: [number, number, number] }) {
  return (
    <group position={position} scale={scale}>
      {/* Tree trunk */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>

      {/* Tree top */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[1, 3, 8]} />
        <meshStandardMaterial color="#228B22" roughness={0.8} />
      </mesh>
    </group>
  )
}

function Rock({ position, scale }: { position: [number, number, number]; scale: [number, number, number] }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#808080" roughness={1} />
    </mesh>
  )
}

function RetroCar() {
  return (
    <group scale={[0.5, 0.5, 0.5]} rotation-y={Math.PI}>
      {/* Car body - main chassis */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[2, 0.8, 4]} />
        <meshPhongMaterial color="#ff0000" />
      </mesh>

      {/* Car top/cabin */}
      <mesh castShadow receiveShadow position={[0, 1, -0.2]}>
        <boxGeometry args={[1.8, 0.7, 2]} />
        <meshPhongMaterial color="#ff0000" />
      </mesh>

      {/* Windows */}
      <mesh castShadow receiveShadow position={[0, 1.1, -0.2]}>
        <boxGeometry args={[1.7, 0.6, 1.9]} />
        <meshPhongMaterial color="#87cefa" transparent opacity={0.7} />
      </mesh>

      {/* Front windshield */}
      <mesh castShadow receiveShadow position={[0, 0.9, 0.9]}>
        <boxGeometry args={[1.7, 0.7, 0.1]} />
        <meshPhongMaterial color="#87cefa" transparent opacity={0.7} />
      </mesh>

      {/* Rear windshield */}
      <mesh castShadow receiveShadow position={[0, 0.9, -1.3]}>
        <boxGeometry args={[1.7, 0.7, 0.1]} />
        <meshPhongMaterial color="#87cefa" transparent opacity={0.7} />
      </mesh>

      {/* Wheels */}
      <mesh castShadow receiveShadow position={[1, 0, 1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshPhongMaterial color="#333333" />
      </mesh>
      <mesh castShadow receiveShadow position={[-1, 0, 1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshPhongMaterial color="#333333" />
      </mesh>
      <mesh castShadow receiveShadow position={[1, 0, -1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshPhongMaterial color="#333333" />
      </mesh>
      <mesh castShadow receiveShadow position={[-1, 0, -1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshPhongMaterial color="#333333" />
      </mesh>

      {/* Wheel caps - front */}
      <mesh castShadow receiveShadow position={[1.15, 0, 1.2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshPhongMaterial color="#dddddd" />
      </mesh>
      <mesh castShadow receiveShadow position={[-1.15, 0, 1.2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshPhongMaterial color="#dddddd" />
      </mesh>

      {/* Wheel caps - rear */}
      <mesh castShadow receiveShadow position={[1.15, 0, -1.2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshPhongMaterial color="#dddddd" />
      </mesh>
      <mesh castShadow receiveShadow position={[-1.15, 0, -1.2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshPhongMaterial color="#dddddd" />
      </mesh>

      {/* Headlights */}
      <mesh castShadow receiveShadow position={[0.6, 0.4, 2]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshPhongMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.6, 0.4, 2]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshPhongMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
      </mesh>

      {/* Taillights */}
      <mesh castShadow receiveShadow position={[0.6, 0.4, -2]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshPhongMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.6, 0.4, -2]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshPhongMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>

      {/* Bumpers */}
      <mesh castShadow receiveShadow position={[0, 0.2, 2]}>
        <boxGeometry args={[1.8, 0.3, 0.2]} />
        <meshPhongMaterial color="#cccccc" />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.2, -2]}>
        <boxGeometry args={[1.8, 0.3, 0.2]} />
        <meshPhongMaterial color="#cccccc" />
      </mesh>
    </group>
  )
}
