// Paso: Importar THREE desde la librería cargada por el HTML
// Esta línea es posible gracias a que la etiqueta <script> en el HTML
// tiene type="module" y src apunta a la versión module de Three.js.
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// --- Variables del Juego ---
let scene, camera, renderer;
let car;
const obstacles = [];
const obstacleSpeed = 0.5; // Velocidad inicial de los obstáculos
let gameSpeed = 1; // Multiplicador de velocidad del juego
let score = 0; // Puntuación por esquivar
let dodgeCount = 0; // Contador de objetos esquivados para aumentar velocidad
const speedIncreaseThreshold = 5; // Cada cuántos esquivados aumenta la velocidad
const speedIncreaseAmount = 0.1; // Cuánto aumenta gameSpeed

// Control del coche
const carSpeed = 0.1; // Velocidad lateral del coche
let moveLeft = false;
let moveRight = false;
let isGameOver = false; // Nueva variable para el estado del juego

// Generación de obstáculos
const obstacleGenerateInterval = 1000; // ms entre generación
let lastObstacleTime = 0;

// Variable para almacenar el ID del requestAnimationFrame
let animationFrameId = null;


// --- Configuración Inicial ---
function init() {
    // 1. Crear la Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Color de fondo (azul cielo)

    // 2. Configurar la Cámara (Tercera Persona)
    // Puedes ajustar la posición (x, y, z) para cambiar la vista
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10); // Un poco arriba y detrás del coche
    camera.lookAt(0, 0, 0); // Inicialmente mira hacia el origen

    // 3. Configurar el Renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement); // Añadir el canvas al body

    // 4. Añadir Iluminación
    const ambientLight = new THREE.AmbientLight(0x404040); // Luz ambiental suave
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Luz direccional
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // 5. Crear la Carretera (Un plano simple)
    const roadGeometry = new THREE.PlaneGeometry(10, 200); // Ancho 10, largo 200
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 }); // Color gris
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; // Rotar para que sea horizontal
    road.position.z = -100; // Extender la carretera hacia atrás
    scene.add(road);

    // 6. Crear el Coche (Una caja simple)
    const carGeometry = new THREE.BoxGeometry(1, 1, 2); // Ancho 1, alto 1, largo 2
    const carMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Color rojo
    car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.set(0, 0.5, 5); // Posición inicial (un poco levantado del suelo, delante de la cámara)
    scene.add(car);

    // 7. Añadir Event Listeners para el movimiento del coche y redimensionamiento
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('resize', onWindowResize, false); // Manejar redimensionamiento

    // Iniciar el bucle de animación
    animate();
}

// --- Bucle de Animación ---
function animate(currentTime) {
    animationFrameId = requestAnimationFrame(animate); // Guardar el ID

    // Si el juego ha terminado, no actualizamos la lógica
    if (isGameOver) {
        return;
    }

    // --- Actualizar Lógica del Juego ---

    // Mover el coche lateralmente
    if (moveLeft) {
        car.position.x -= carSpeed * gameSpeed; // La velocidad lateral también podría escalar
        // Opcional: Limitar movimiento para que no se salga de la carretera
        if (car.position.x < -4.5) car.position.x = -4.5;
    }
    if (moveRight) {
        car.position.x += carSpeed * gameSpeed; // La velocidad lateral también podría escalar
        // Opcional: Limitar movimiento para que no se salga de la carretera
        if (car.position.x > 4.5) car.position.x = 4.5;
    }

    // Generar nuevos obstáculos
    const now = currentTime || performance.now();
    if (now - lastObstacleTime > obstacleGenerateInterval / gameSpeed) {
        createObstacle();
        lastObstacleTime = now;
    }

    // Mover obstáculos hacia adelante y detección de colisiones/esquivar
    // Crear la caja delimitadora del coche UNA VEZ por frame
    const carBox = new THREE.Box3().setFromObject(car);

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.position.z += (obstacleSpeed * gameSpeed); // Mover en el eje Z positivo (hacia la cámara)

        // Crear la caja delimitadora del obstáculo actual
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);

        // --- Detección de Colisión ---
        if (carBox.intersectsBox(obstacleBox)) {
            console.log("¡Colisión!");
            // Lógica de fin de juego
            gameOver();
            // Podemos romper el bucle aquí ya que el juego ha terminado
            break;
        }

        // --- Detección de "Esquivar" y Eliminación de Obstáculos ---
        // Si el obstáculo pasa el coche y no ha habido colisión con ESTE obstáculo antes
        if (obstacle.position.z > car.position.z + 1 && !obstacle.userData.passed) {
             // Marcar como pasado para no contarlo múltiples veces
             obstacle.userData.passed = true;
             dodgeCount++; // Incrementar contador de esquivados
             score += 10; // Sumar puntos

             // Verificar si debemos aumentar la velocidad
             if (dodgeCount > 0 && dodgeCount % speedIncreaseThreshold === 0) {
                 gameSpeed += speedIncreaseAmount; // Aumentar la velocidad del juego
                 console.log("¡Velocidad aumentada! Velocidad actual:", gameSpeed.toFixed(2));
             }

             console.log("¡Objeto esquivado! Puntuación:", score, "Esquivados:", dodgeCount);
        }

        // Si el obstáculo está muy adelante (fuera de vista), eliminarlo
        if (obstacle.position.z > camera.position.z + 5) {
            scene.remove(obstacle);
            obstacles.splice(i, 1);
        }
    }

    // --- Renderizar la Escena ---
    renderer.render(scene, camera);
}

// --- Funciones Auxiliares ---

// Crear un obstáculo
function createObstacle() {
    const obstacleGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5); // Tamaño del obstáculo
    // Color aleatorio para los obstáculos
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

    // Posicionar el obstáculo aleatoriamente en el eje X (dentro del ancho de la carretera)
    // y lejos en el eje Z (apareciendo al final de la carretera)
    const randomX = (Math.random() - 0.5) * 8; // Entre -4 y 4 para que esté en la carretera
    const spawnZ = -150; // Posición Z donde aparecen los obstáculos (lejos)
    obstacle.position.set(randomX, 0.75, spawnZ); // 0.75 para que esté sobre el suelo

    // Añadir una propiedad para rastrear si ya ha pasado el coche
    obstacle.userData.passed = false;

    scene.add(obstacle);
    obstacles.push(obstacle); // Añadir al array de obstáculos para gestionarlos
}

// Manejar eventos de teclado
function onKeyDown(event) {
    // Si el juego ha terminado, no procesamos eventos de teclado para movimiento
    if (isGameOver) {
        return;
    }
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            moveLeft = true;
            break;
        case 'ArrowRight':
        case 'd':
            moveRight = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            moveLeft = false;
            break;
        case 'ArrowRight':
        case 'd':
            moveRight = false;
            break;
    }
}


// Manejar redimensionamiento de la ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Función para manejar el fin del juego
function gameOver() {
    isGameOver = true;
    console.log("¡Game Over! Puntuación final:", score);
    // Detener el bucle de animación
    cancelAnimationFrame(animationFrameId);

    // Aquí podrías añadir lógica adicional como mostrar un mensaje en pantalla
    // o un botón para reiniciar.
    alert("¡Game Over! Puntuación final: " + score);
}


// --- Iniciar el Juego ---
init();