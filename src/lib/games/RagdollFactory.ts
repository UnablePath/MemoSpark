import { RigidBody, Joint, RagdollConfig, Vector2D } from './PhysicsTypes';

export class RagdollFactory {
  static createRagdoll(config: RagdollConfig): { bodies: RigidBody[]; joints: Joint[] } {
    const bodies: RigidBody[] = [];
    const joints: Joint[] = [];

    const { position } = config;

    // Create head
    const head: RigidBody = {
      id: 'head',
      position: { x: position.x, y: position.y },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      rotation: 0,
      mass: config.mass * 0.1,
      radius: config.headRadius,
      restitution: config.restitution,
      isStatic: false,
      color: '#FFB6C1',
      type: 'head'
    };

    // Create torso
    const torso: RigidBody = {
      id: 'torso',
      position: { x: position.x, y: position.y + config.headRadius + config.torsoHeight / 2 },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      rotation: 0,
      mass: config.mass * 0.4,
      radius: config.torsoWidth / 2,
      restitution: config.restitution,
      isStatic: false,
      color: '#87CEEB',
      type: 'torso'
    };

    // Create left arm
    const leftArm: RigidBody = {
      id: 'leftArm',
      position: { 
        x: position.x - config.torsoWidth / 2 - config.limbLength / 2, 
        y: position.y + config.headRadius + config.torsoHeight / 4 
      },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      rotation: 0,
      mass: config.mass * 0.1,
      radius: config.limbRadius,
      restitution: config.restitution,
      isStatic: false,
      color: '#DDA0DD',
      type: 'limb'
    };

    // Create right arm
    const rightArm: RigidBody = {
      id: 'rightArm',
      position: { 
        x: position.x + config.torsoWidth / 2 + config.limbLength / 2, 
        y: position.y + config.headRadius + config.torsoHeight / 4 
      },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      rotation: 0,
      mass: config.mass * 0.1,
      radius: config.limbRadius,
      restitution: config.restitution,
      isStatic: false,
      color: '#DDA0DD',
      type: 'limb'
    };

    // Create left leg
    const leftLeg: RigidBody = {
      id: 'leftLeg',
      position: { 
        x: position.x - config.torsoWidth / 4, 
        y: position.y + config.headRadius + config.torsoHeight + config.limbLength / 2 
      },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      rotation: 0,
      mass: config.mass * 0.15,
      radius: config.limbRadius,
      restitution: config.restitution,
      isStatic: false,
      color: '#F0E68C',
      type: 'limb'
    };

    // Create right leg
    const rightLeg: RigidBody = {
      id: 'rightLeg',
      position: { 
        x: position.x + config.torsoWidth / 4, 
        y: position.y + config.headRadius + config.torsoHeight + config.limbLength / 2 
      },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      rotation: 0,
      mass: config.mass * 0.15,
      radius: config.limbRadius,
      restitution: config.restitution,
      isStatic: false,
      color: '#F0E68C',
      type: 'limb'
    };

    bodies.push(head, torso, leftArm, rightArm, leftLeg, rightLeg);

    // Create joints
    const neckJoint: Joint = {
      id: 'neck',
      bodyAId: 'head',
      bodyBId: 'torso',
      restLength: config.headRadius + config.torsoHeight / 2,
      stiffness: config.jointStiffness
    };

    const leftShoulderJoint: Joint = {
      id: 'leftShoulder',
      bodyAId: 'torso',
      bodyBId: 'leftArm',
      restLength: config.torsoWidth / 2 + config.limbLength / 2,
      stiffness: config.jointStiffness
    };

    const rightShoulderJoint: Joint = {
      id: 'rightShoulder',
      bodyAId: 'torso',
      bodyBId: 'rightArm',
      restLength: config.torsoWidth / 2 + config.limbLength / 2,
      stiffness: config.jointStiffness
    };

    const leftHipJoint: Joint = {
      id: 'leftHip',
      bodyAId: 'torso',
      bodyBId: 'leftLeg',
      restLength: config.torsoHeight / 2 + config.limbLength / 2,
      stiffness: config.jointStiffness
    };

    const rightHipJoint: Joint = {
      id: 'rightHip',
      bodyAId: 'torso',
      bodyBId: 'rightLeg',
      restLength: config.torsoHeight / 2 + config.limbLength / 2,
      stiffness: config.jointStiffness
    };

    joints.push(neckJoint, leftShoulderJoint, rightShoulderJoint, leftHipJoint, rightHipJoint);

    return { bodies, joints };
  }

  static createDefaultConfig(position: Vector2D): RagdollConfig {
    return {
      headRadius: 15,
      torsoWidth: 20,
      torsoHeight: 40,
      limbLength: 30,
      limbRadius: 8,
      jointStiffness: 0.8,
      mass: 10,
      restitution: 0.3,
      position
    };
  }

  static createCustomRagdoll(
    position: Vector2D,
    customizations: Partial<RagdollConfig>
  ): { bodies: RigidBody[]; joints: Joint[] } {
    const config = { ...this.createDefaultConfig(position), ...customizations };
    return this.createRagdoll(config);
  }

  static resetRagdollPosition(
    bodies: RigidBody[],
    newPosition: Vector2D
  ): void {
    const headBody = bodies.find(b => b.id === 'head');
    if (!headBody) return;

    const offset = {
      x: newPosition.x - headBody.position.x,
      y: newPosition.y - headBody.position.y
    };

    bodies.forEach(body => {
      body.position.x += offset.x;
      body.position.y += offset.y;
      body.velocity = { x: 0, y: 0 };
      body.angularVelocity = 0;
      body.rotation = 0;
    });
  }
} 