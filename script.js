const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
});
document.body.appendChild(app.view);

const creatures = [];
const numCreatures = 50;
let mouseX = app.screen.width / 2;
let mouseY = app.screen.height / 2;

class Creature {
    constructor() {
        this.graphics = new PIXI.Graphics();
        this.x = Math.random() * app.screen.width;
        this.y = Math.random() * app.screen.height;
        this.vx = Math.random() * 4 - 2;
        this.vy = Math.random() * 4 - 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.speed = 0.5 + Math.random() * 1;
        this.color = Math.random() * 0xFFFFFF;
        this.trailPoints = [];
        this.maxTrailLength = 20;
        this.alpha = 1;
        app.stage.addChild(this.graphics);
    }

    update() {
        // Gradually decrease alpha over time
        if (this.alpha > 0.2) {
            this.alpha -= 0.005;
        }

        // Update target occasionally
        if (Math.random() < 0.02) {
            this.targetX = mouseX + (Math.random() * 200 - 100);
            this.targetY = mouseY + (Math.random() * 200 - 100);
        }

        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            this.vx += (dx / distance) * this.speed;
            this.vy += (dy / distance) * this.speed;
        }

        // Apply velocity with damping
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > app.screen.width) this.vx *= -1;
        if (this.y < 0 || this.y > app.screen.height) this.vy *= -1;

        this.trailPoints.unshift({ x: this.x, y: this.y });
        if (this.trailPoints.length > this.maxTrailLength) {
            this.trailPoints.pop();
        }

        this.draw();
    }

    draw() {
        this.graphics.clear();
        
        // Draw trail
        this.graphics.lineStyle(2, this.color, this.alpha * 0.5);
        for (let i = 1; i < this.trailPoints.length; i++) {
            const p1 = this.trailPoints[i - 1];
            const p2 = this.trailPoints[i];
            this.graphics.moveTo(p1.x, p1.y);
            this.graphics.lineTo(p2.x, p2.y);
            this.graphics.alpha = (1 - (i / this.maxTrailLength)) * this.alpha;
        }

        // Draw creature
        this.graphics.beginFill(this.color, this.alpha);
        this.graphics.drawCircle(this.x, this.y, 3);
        this.graphics.endFill();
    }
}

for (let i = 0; i < numCreatures; i++) {
    creatures.push(new Creature());
}

app.ticker.add(() => {
    creatures.forEach(creature => creature.update());
});

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    const cursor = document.getElementById('cursor');
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
});

window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
});