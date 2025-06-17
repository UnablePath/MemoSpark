'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Heart,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface RagdollGameProps {
  onStressRelief?: (amount: number) => void;
  initialStress?: number;
}

interface RagdollPart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  type: 'head' | 'body' | 'arm' | 'leg';
}

export const RagdollGame: React.FC<RagdollGameProps> = ({
  onStressRelief,
  initialStress = 100
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const ragdollPartsRef = useRef<RagdollPart[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStress, setCurrentStress] = useState(initialStress);
  const [totalRelieved, setTotalRelieved] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

  // Initialize ragdoll
  const initializeRagdoll = useCallback(() => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;

    ragdollPartsRef.current = [
      // Head
      { x: centerX, y: centerY - 40, vx: 0, vy: 0, width: 30, height: 30, color: '#ffdbac', type: 'head' },
      // Body
      { x: centerX, y: centerY, vx: 0, vy: 0, width: 25, height: 50, color: '#ff6b6b', type: 'body' },
      // Arms
      { x: centerX - 30, y: centerY - 10, vx: 0, vy: 0, width: 20, height: 35, color: '#ffdbac', type: 'arm' },
      { x: centerX + 30, y: centerY - 10, vx: 0, vy: 0, width: 20, height: 35, color: '#ffdbac', type: 'arm' },
      // Legs
      { x: centerX - 15, y: centerY + 40, vx: 0, vy: 0, width: 18, height: 40, color: '#4ecdc4', type: 'leg' },
      { x: centerX + 15, y: centerY + 40, vx: 0, vy: 0, width: 18, height: 40, color: '#4ecdc4', type: 'leg' },
    ];
  }, [canvasSize]);

  // Update canvas size for mobile
  useEffect(() => {
    const updateCanvasSize = () => {
      const isMobile = window.innerWidth < 768;
      setCanvasSize({
        width: isMobile ? Math.min(350, window.innerWidth - 40) : 600,
        height: isMobile ? 300 : 400
      });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Initialize ragdoll when canvas size changes
  useEffect(() => {
    initializeRagdoll();
  }, [initializeRagdoll]);

  // Physics update
  const updatePhysics = useCallback(() => {
    ragdollPartsRef.current.forEach(part => {
      // Apply gravity
      part.vy += 0.5;
      
      // Apply velocity
      part.x += part.vx;
      part.y += part.vy;
      
      // Apply friction
      part.vx *= 0.99;
      part.vy *= 0.99;
      
      // Boundary collision
      if (part.x - part.width/2 < 0) {
        part.x = part.width/2;
        part.vx *= -0.7;
      }
      if (part.x + part.width/2 > canvasSize.width) {
        part.x = canvasSize.width - part.width/2;
        part.vx *= -0.7;
      }
      if (part.y + part.height/2 > canvasSize.height) {
        part.y = canvasSize.height - part.height/2;
        part.vy *= -0.7;
        part.vx *= 0.8; // Ground friction
      }
      if (part.y - part.height/2 < 0) {
        part.y = part.height/2;
        part.vy *= -0.7;
      }
    });
  }, [canvasSize]);

  // Render loop
  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      updatePhysics();

      // Clear canvas
      ctx.fillStyle = '#e8f4f8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw ground
      ctx.fillStyle = '#a8e6cf';
      ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

      // Draw ragdoll parts
      ragdollPartsRef.current.forEach(part => {
        ctx.fillStyle = part.color;
        ctx.fillRect(
          part.x - part.width/2, 
          part.y - part.height/2, 
          part.width, 
          part.height
        );

        // Add simple face on head
        if (part.type === 'head') {
          ctx.fillStyle = '#000';
          ctx.fillRect(part.x - 8, part.y - 8, 3, 3); // Left eye
          ctx.fillRect(part.x + 5, part.y - 8, 3, 3); // Right eye
          ctx.fillRect(part.x - 5, part.y + 2, 10, 2); // Mouth
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updatePhysics]);

  const performAction = useCallback((actionType: string, stressRelief: number) => {
    setCurrentStress(prev => Math.max(0, prev - stressRelief));
    setTotalRelieved(prev => prev + stressRelief);
    onStressRelief?.(stressRelief);

    // Apply force to ragdoll
    const head = ragdollPartsRef.current[0];
    if (head) {
      switch (actionType) {
        case 'punch':
          head.vx += Math.random() * 20 - 10;
          head.vy -= Math.random() * 15;
          break;
        case 'kick':
          head.vx += Math.random() * 30 - 15;
          head.vy -= Math.random() * 20;
          break;
        case 'throw':
          head.vx += Math.random() * 40 - 20;
          head.vy -= Math.random() * 25;
          break;
      }
    }

    // Add some random motion to other parts
    ragdollPartsRef.current.slice(1).forEach(part => {
      part.vx += Math.random() * 10 - 5;
      part.vy -= Math.random() * 5;
    });
  }, [onStressRelief]);

  const resetRagdoll = useCallback(() => {
    initializeRagdoll();
  }, [initializeRagdoll]);

  return (
    <div className="w-full h-full flex flex-col p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Stress Relief Game</h1>
          <Badge variant="secondary" className="text-sm px-2 py-1">
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Stress: {currentStress}%
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            variant={isPlaying ? "destructive" : "default"}
            size="sm"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="ml-1">{isPlaying ? "Pause" : "Play"}</span>
          </Button>
          <Button 
            onClick={() => setShowSettings(!showSettings)} 
            variant="outline" 
            size="sm"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* Canvas */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border-2 border-gray-300 rounded-lg bg-white shadow-lg cursor-crosshair w-full"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          
          {/* Stress Meter Overlay */}
          <div className="absolute top-2 left-2 bg-white/90 rounded-lg p-2 shadow-lg">
            <div className="text-xs font-medium mb-1">Progress</div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-300"
                style={{ width: `${100 - currentStress}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Relief: {totalRelieved}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <Card className="w-full lg:w-64 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => performAction('punch', 10)}
              disabled={!isPlaying}
              className="w-full justify-start text-left text-sm"
              size="sm"
            >
              <span className="text-lg mr-2">👊</span>
              <div className="flex-1">
                <div>Punch</div>
              </div>
              <Badge variant="outline" className="ml-2 text-xs">-10</Badge>
            </Button>
            
            <Button
              onClick={() => performAction('kick', 15)}
              disabled={!isPlaying}
              className="w-full justify-start text-left text-sm"
              size="sm"
            >
              <span className="text-lg mr-2">🦵</span>
              <div className="flex-1">
                <div>Kick</div>
              </div>
              <Badge variant="outline" className="ml-2 text-xs">-15</Badge>
            </Button>
            
            <Button
              onClick={() => performAction('throw', 20)}
              disabled={!isPlaying}
              className="w-full justify-start text-left text-sm"
              size="sm"
            >
              <span className="text-lg mr-2">🏀</span>
              <div className="flex-1">
                <div>Throw</div>
              </div>
              <Badge variant="outline" className="ml-2 text-xs">-20</Badge>
            </Button>

            <Button
              onClick={resetRagdoll}
              variant="outline"
              className="w-full text-sm"
              size="sm"
            >
              Reset Position
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sound Effects</label>
                  <Switch 
                    checked={soundEnabled} 
                    onCheckedChange={setSoundEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 