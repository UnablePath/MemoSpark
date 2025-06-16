import { Vector2D, RigidBody, Joint, Force } from './PhysicsTypes';

export class PhysicsEngine {
  private bodies: RigidBody[] = [];
  private joints: Joint[] = [];
  private gravity: Vector2D = { x: 0, y: 9.81 };
  private damping: number = 0.99;
  private worldBounds: { width: number; height: number };

  constructor(worldBounds: { width: number; height: number }) {
    this.worldBounds = worldBounds;
  }

  addBody(body: RigidBody): void {
    this.bodies.push(body);
  }

  removeBody(id: string): void {
    this.bodies = this.bodies.filter(body => body.id !== id);
  }

  addJoint(joint: Joint): void {
    this.joints.push(joint);
  }

  applyForce(bodyId: string, force: Force): void {
    const body = this.bodies.find(b => b.id === bodyId);
    if (body) {
      body.velocity.x += force.x / body.mass;
      body.velocity.y += force.y / body.mass;
    }
  }

  step(deltaTime: number): void {
    this.updatePhysics(deltaTime);
    this.checkCollisions();
    this.updateJoints();
    this.handleBoundaries();
  }

  private updatePhysics(deltaTime: number): void {
    for (const body of this.bodies) {
      if (!body.isStatic) {
        // Apply gravity
        body.velocity.y += this.gravity.y * deltaTime;
        
        // Apply damping
        body.velocity.x *= this.damping;
        body.velocity.y *= this.damping;
        
        // Update position
        body.position.x += body.velocity.x * deltaTime;
        body.position.y += body.velocity.y * deltaTime;
        
        // Update rotation
        body.rotation += body.angularVelocity * deltaTime;
      }
    }
  }

  private checkCollisions(): void {
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bodyA = this.bodies[i];
        const bodyB = this.bodies[j];
        
        if (this.isColliding(bodyA, bodyB)) {
          this.resolveCollision(bodyA, bodyB);
        }
      }
    }
  }

  private isColliding(bodyA: RigidBody, bodyB: RigidBody): boolean {
    const dx = bodyA.position.x - bodyB.position.x;
    const dy = bodyA.position.y - bodyB.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (bodyA.radius + bodyB.radius);
  }

  private resolveCollision(bodyA: RigidBody, bodyB: RigidBody): void {
    const dx = bodyA.position.x - bodyB.position.x;
    const dy = bodyA.position.y - bodyB.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const nx = dx / distance;
    const ny = dy / distance;
    
    // Separate objects
    const overlap = (bodyA.radius + bodyB.radius) - distance;
    const totalMass = bodyA.mass + bodyB.mass;
    
    if (!bodyA.isStatic) {
      bodyA.position.x += nx * overlap * (bodyB.mass / totalMass);
      bodyA.position.y += ny * overlap * (bodyB.mass / totalMass);
    }
    
    if (!bodyB.isStatic) {
      bodyB.position.x -= nx * overlap * (bodyA.mass / totalMass);
      bodyB.position.y -= ny * overlap * (bodyA.mass / totalMass);
    }
    
    // Calculate relative velocity
    const relativeVelocityX = bodyA.velocity.x - bodyB.velocity.x;
    const relativeVelocityY = bodyA.velocity.y - bodyB.velocity.y;
    
    const velocityInNormal = relativeVelocityX * nx + relativeVelocityY * ny;
    
    if (velocityInNormal > 0) return;
    
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const impulse = -(1 + restitution) * velocityInNormal / totalMass;
    
    if (!bodyA.isStatic) {
      bodyA.velocity.x += impulse * bodyB.mass * nx;
      bodyA.velocity.y += impulse * bodyB.mass * ny;
    }
    
    if (!bodyB.isStatic) {
      bodyB.velocity.x -= impulse * bodyA.mass * nx;
      bodyB.velocity.y -= impulse * bodyA.mass * ny;
    }
  }

  private updateJoints(): void {
    for (const joint of this.joints) {
      const bodyA = this.bodies.find(b => b.id === joint.bodyAId);
      const bodyB = this.bodies.find(b => b.id === joint.bodyBId);
      
      if (!bodyA || !bodyB) continue;
      
      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > joint.restLength) {
        const difference = distance - joint.restLength;
        const percent = difference / distance / 2;
        const offsetX = dx * percent;
        const offsetY = dy * percent;
        
        if (!bodyA.isStatic) {
          bodyA.position.x += offsetX;
          bodyA.position.y += offsetY;
        }
        
        if (!bodyB.isStatic) {
          bodyB.position.x -= offsetX;
          bodyB.position.y -= offsetY;
        }
      }
    }
  }

  private handleBoundaries(): void {
    for (const body of this.bodies) {
      if (body.isStatic) continue;
      
      // Floor collision
      if (body.position.y + body.radius > this.worldBounds.height) {
        body.position.y = this.worldBounds.height - body.radius;
        body.velocity.y *= -body.restitution;
      }
      
      // Ceiling collision
      if (body.position.y - body.radius < 0) {
        body.position.y = body.radius;
        body.velocity.y *= -body.restitution;
      }
      
      // Wall collisions
      if (body.position.x - body.radius < 0) {
        body.position.x = body.radius;
        body.velocity.x *= -body.restitution;
      }
      
      if (body.position.x + body.radius > this.worldBounds.width) {
        body.position.x = this.worldBounds.width - body.radius;
        body.velocity.x *= -body.restitution;
      }
    }
  }

  getBodies(): RigidBody[] {
    return this.bodies;
  }

  getJoints(): Joint[] {
    return this.joints;
  }

  setGravity(gravity: Vector2D): void {
    this.gravity = gravity;
  }

  reset(): void {
    this.bodies = [];
    this.joints = [];
  }
} 