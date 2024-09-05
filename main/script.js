// const container = document.getElementById('cubeBackground');
// Append the renderer to the body instead of #cubeBackground


// let scene, camera, renderer, cubes = [];
const mouse = new THREE.Vector2();
let mouseVelocity = new THREE.Vector2();

// Dynamic parameters
let params = {
    cubeCount: 1000,
    cubeSpacing: 0.5,
    cubeSize: 0.4,
    mouseInfluence: 50,
    mouseEffectStrength: 1,
    mouseVelocity: 0.1,
    textMargin: 100, // Margin around text bubbles
    cubeFade: 100,   // Distance over which scaling occurs
    minSize: 0.1,    // Minimum size of cubes
    shrinkMult: 1.0, // Scaling factor for cubes
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setClearColor(0xffffff, 0.0);
// renderer.setClearColor(0x000000, 0); // Set second argument (alpha) to 0 for transparency

// Set the renderer to cover the entire screen and be top-most
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = 0;
renderer.domElement.style.left = 0;
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
// renderer.domElement.style.pointerEvents = 'none'
// renderer.domElement.style.zIndex = 9998;  // High z-index to ensure it's on top of everything
document.body.appendChild(renderer.domElement);

// document.getElementById('cubeBackground').appendChild(renderer.domElement);

const cubeSize = 0.4;
const spacing = cubeSize * 1.0;
const gridSize = 0;

const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const material = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.8,
    metalness: 0.2
});

const cubes = [];
const bubbles = [];

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

function createTextBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'text-bubble';
    bubble.textContent = text;
    document.getElementById('textContainer').appendChild(bubble);
}

function getBubbblePosition(bubble) {
    const rect = bubble.getBoundingClientRect();
    bubble.width = (rect.right - rect.left);
    bubble.height = (rect.bottom - rect.top);
    bubble.position = new THREE.Vector3((rect.left + (bubble.width / 2)), (rect.top + (bubble.height / 2)), 0);
}

// const texts = [
//     "Hello, world!",
//     "This is a test",
//     "Wrapped by cubes many times",
//     "Cool effect",
//     "3D text bubbles"
// ];

// texts.forEach(createTextBubble);

const divsToAvoid = document.querySelectorAll('div:not(.cube-ignore)');
divsToAvoid.forEach(div => {
    bubbles.push(div);
});
bubbles.forEach(getBubbblePosition);

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    cubes.forEach((cube) => {
        const mouseX = mouse.x;
        const mouseY = -mouse.y;

        const distanceX = mouseX - cube.screenPos.x;
        const distanceY = mouseY - cube.screenPos.y;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        const maxDistance = params.mouseInfluence * 0.5;

        const baseFloat = Math.sin(time + cube.originalPosition.x + cube.originalPosition.y) * 0.2;

        if (distance < maxDistance) {
            const scale = 1 - distance / maxDistance;
            const movement = scale * params.mouseEffectStrength * 0.2;

            const angle = Math.atan2(distanceY, distanceX);
            const moveX = Math.cos(angle) * movement;
            const moveY = Math.sin(angle) * movement;

            cube.targetOffset.x = -moveX + mouseVelocity.x * params.mouseVelocity * 0.05;
            cube.targetOffset.y = -moveY + mouseVelocity.y * params.mouseVelocity * 0.05;
            cube.targetOffset.z = baseFloat + movement * 0.3;

            cube.rotation.x = -cube.targetOffset.y * 0.1;
            cube.rotation.y = cube.targetOffset.x * 0.1;
        } else {
            cube.targetOffset.z = baseFloat;
        }

        cube.currentOffset.lerp(cube.targetOffset, 0.2);
        cube.position.copy(cube.originalPosition).add(cube.currentOffset);
    });

    renderer.render(scene, camera);
}

camera.position.set(gridSize * cubeSize / 2, gridSize * cubeSize / 2, 15);
camera.lookAt(new THREE.Vector3(gridSize * cubeSize / 2, gridSize * cubeSize / 2, 0));

function projectToScreen(position, camera, renderer) {
    const vector = position.clone().project(camera);
    const halfWidth = renderer.domElement.width / 2;
    const halfHeight = renderer.domElement.height / 2;

    const pixelX = (vector.x * halfWidth) + halfWidth;
    const pixelY = -(vector.y * halfHeight) + halfHeight;

    return new THREE.Vector3(pixelX, pixelY, 0);
}

function createCubes() {
    let screenPos = projectToScreen(new THREE.Vector3(0, 0, 0), camera, renderer);

    let yLim = null;
    let xLim = null;

    let x = 0;
    let borderX = false;

    while (!borderX && x < 100) {
        const y = 0;
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x * spacing, y * spacing, 0);
        cube.originalPosition = cube.position.clone();
        cube.currentOffset = new THREE.Vector3();
        cube.targetOffset = new THREE.Vector3();

        screenPos = projectToScreen(cube.position, camera, renderer);
        cube.screenPos = screenPos;
        if (screenPos.x > window.innerWidth) {
            borderX = true;
            xLim = x + 10;
        }
        x += 1;
    }

    let y = 0;
    let borderY = false;
    while (!borderY && y < 300) {
        const x = 0;
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x * spacing, y * spacing, 0);
        cube.originalPosition = cube.position.clone();
        cube.currentOffset = new THREE.Vector3();
        cube.targetOffset = new THREE.Vector3();

        screenPos = projectToScreen(cube.position, camera, renderer);
        cube.screenPos = screenPos;
        if (screenPos.y < 0) {
            yLim = y + 10;
            borderY = true;
        }
        y += 1;
    }

    for (let x = -xLim; x < xLim; x++) {
        for (let y = -yLim; y < yLim; y++) {
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(x * spacing, y * spacing, 0);
            cube.originalPosition = cube.position.clone();
            cube.currentOffset = new THREE.Vector3();
            cube.targetOffset = new THREE.Vector3();

            screenPos = projectToScreen(cube.position, camera, renderer);
            cube.screenPos = screenPos;

            const edges = new THREE.EdgesGeometry(geometry);
            const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
            const line = new THREE.LineSegments(edges, edgeMaterial);
            cube.add(line);

            scene.add(cube);
            cubes.push(cube);
        }
    }
}

function renderCubes() {
    cubes.forEach(cube => {
        cube.visible = true;
        let minDistance = Infinity;

        bubbles.forEach(bubble => {
            const distanceX = Math.abs(cube.screenPos.x - bubble.position.x);
            const distanceY = Math.abs(cube.screenPos.y - bubble.position.y);

            if (distanceX < bubble.width / 2 + params.textMargin && distanceY < bubble.height / 2 + params.textMargin) {
                cube.visible = false;
            } else {
                cube.scale.setScalar(1.0);
                const distance = Math.sqrt(
                    Math.pow(Math.max(0, distanceX - bubble.width / 2), 2) +
                    Math.pow(Math.max(0, distanceY - bubble.height / 2), 2)
                );
                minDistance = Math.min(minDistance, distance);
            }
        });

        if (cube.visible) {
            const distanceFromEdge = minDistance;

            if ((distanceFromEdge < (params.cubeFade + params.textMargin)) && (distanceFromEdge > params.textMargin)) {
                const scaleFactor = Math.max(0, (distanceFromEdge - params.textMargin) / params.cubeFade);
                const scale = scaleFactor * params.shrinkMult;
                cube.scale.setScalar(scale);
            }
        }
    });
}

function purgeScene(scene) {
    for (let i = scene.children.length - 1; i >= 0; i--) {
        let obj = scene.children[i];
        if (obj instanceof THREE.Mesh) {
            scene.remove(obj);
        }
    }
}

function onMouseMove(event) {
    // const container = document.getElementById('cubeBackground');
    // const rect = container.getBoundingClientRect();
    const newMouseX = event.clientX;
    const newMouseY = -event.clientY;

    mouseVelocity.x = newMouseX - mouse.x;
    mouseVelocity.y = newMouseY - mouse.y;

    mouse.x = newMouseX;
    mouse.y = newMouseY;
}

// container.addEventListener('mousemove', onMouseMove);
document.body.addEventListener('mousemove', onMouseMove); // Attach mouse move event to body

let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;
const resizeThreshold = 100;

window.addEventListener('resize', () => {
    const widthChange = Math.abs(window.innerWidth - lastWidth);
    const heightChange = Math.abs(window.innerHeight - lastHeight);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (widthChange > resizeThreshold || heightChange > resizeThreshold) {
        cubes.length = 0;
        purgeScene(scene);
        createCubes();
        renderCubes();

        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
    }
});

const gui = new dat.GUI();
document.body.appendChild(gui.domElement); // Manually append the GUI

// Set the GUI to have a higher z-index than the WebGL canvas
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '0px';
gui.domElement.style.right = '10px';
gui.domElement.style.zIndex = 9999;  // Higher z-index than the WebGL canvas

gui.add(params, 'cubeSize', 0.1, 1).onChange(renderCubes);
gui.add(params, 'cubeSpacing', 0.5, 2).onChange(renderCubes);
gui.add(params, 'mouseInfluence', 10, 100);
gui.add(params, 'mouseEffectStrength', 0.1, 5);
gui.add(params, 'mouseVelocity', 0, 1);
gui.add(params, 'textMargin', 0, 200).onChange(renderCubes);
gui.add(params, 'cubeFade', 0, 200).onChange(renderCubes);
gui.add(params, 'minSize', 0.0, 1).onChange(renderCubes);
gui.add(params, 'shrinkMult', 0.00, 1).onChange(renderCubes);
gui.close()

createCubes();
animate();
renderCubes();
