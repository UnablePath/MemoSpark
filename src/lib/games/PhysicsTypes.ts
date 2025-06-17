export interface Vector2D {
  x: number;
  y: number;
}

export interface Force extends Vector2D {}

export interface RigidBody {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  angularVelocity: number;
  rotation: number;
  mass: number;
  radius: number;
  restitution: number;
  isStatic: boolean;
  color?: string;
  type?: 'head' | 'torso' | 'limb' | 'weapon' | 'ground';
}

export interface Joint {
  id: string;
  bodyAId: string;
  bodyBId: string;
  restLength: number;
  stiffness: number;
}

export interface RagdollConfig {
  headRadius: number;
  torsoWidth: number;
  torsoHeight: number;
  limbLength: number;
  limbRadius: number;
  jointStiffness: number;
  mass: number;
  restitution: number;
  position: Vector2D;
}

export interface GameAction {
  id: string;
  type: 'punch' | 'kick' | 'throw' | 'drop' | 'explode' | 'freeze';
  icon: string;
  force: number;
  cooldown: number;
  stressRelief: number;
}

export interface StressMeterState {
  currentStress: number;
  maxStress: number;
  relievedStress: number;
  totalRelieved: number;
}

export interface GameStats {
  actionsPerformed: number;
  stressReliefTotal: number;
  favoriteAction: string;
  playTime: number;
  lastPlayed: Date;
} 