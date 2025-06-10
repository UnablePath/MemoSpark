'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { VoiceService, VoiceProcessingResult } from '../../lib/ai/VoiceService';
import { cn } from '../../lib/utils';

interface VoiceInputProps {
  onTasksExtracted?: (tasks: VoiceProcessingResult['extractedTasks']) => void;
  onTranscription?: (transcription: string) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  isPremium?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTasksExtracted,
  onTranscription,
  onError,
  className,
  disabled = false,
  isPremium = false
}) => {
  const [voiceService] = useState(() => new VoiceService());
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    setIsSupported(voiceService.isVoiceSupported());
  }, [voiceService]);

  const startListening = async () => {
    if (!isSupported || disabled || !isPremium) {
      onError?.('Voice input requires Premium subscription');
      return;
    }

    try {
      setIsListening(true);
      setIsProcessing(true);
      setTranscript('');
      
      const result = await voiceService.processVoiceInput(null, 'user-id');
      
      setTranscript(result.transcription);
      setConfidence(result.confidence);
      onTranscription?.(result.transcription);
      
      if (result.extractedTasks.length > 0) {
        onTasksExtracted?.(result.extractedTasks);
      }
      
    } catch (error) {
      console.error('Voice input error:', error);
      onError?.('Failed to process voice input');
    } finally {
      setIsListening(false);
      setIsProcessing(false);
    }
  };

  const stopListening = () => {
    voiceService.stopListening();
    setIsListening(false);
    setIsProcessing(false);
  };

  const speakText = async (text: string) => {
    if (!isSupported || !isPremium) return;
    
    try {
      await voiceService.speak(text, {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  };

  if (!isPremium) {
    return (
      <div className={cn("flex items-center gap-2 p-4 bg-gray-50 rounded-lg border", className)}>
        <MicOff className="h-5 w-5 text-gray-400" />
        <div className="flex-1">
          <p className="text-sm text-gray-600">Voice Input</p>
          <p className="text-xs text-gray-500">Premium feature - upgrade to unlock</p>
        </div>
        <Button variant="outline" size="sm" disabled>
          Upgrade
        </Button>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className={cn("flex items-center gap-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200", className)}>
        <MicOff className="h-5 w-5 text-yellow-600" />
        <div className="flex-1">
          <p className="text-sm text-yellow-800">Voice input not supported</p>
          <p className="text-xs text-yellow-600">This browser doesn't support speech recognition</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Voice Input Controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={disabled || isProcessing}
          variant={isListening ? "destructive" : "default"}
          size="sm"
          className={cn(
            "flex items-center gap-2",
            isListening && "animate-pulse"
          )}
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Start Voice Input'}
            </>
          )}
        </Button>

        {transcript && (
          <Button
            onClick={() => speakText(transcript)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Volume2 className="h-4 w-4" />
            Replay
          </Button>
        )}
      </div>

      {/* Voice Visualizer */}
      {isListening && (
        <div className="flex items-center justify-center gap-1 h-12 bg-blue-50 rounded-lg border border-blue-200">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 bg-blue-500 rounded-full animate-pulse",
                "h-4 animate-bounce"
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${0.5 + i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Transcript Display */}
      {transcript && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 mb-1">
                Transcription
                {confidence > 0 && (
                  <span className="ml-2 text-xs text-green-600">
                    ({Math.round(confidence * 100)}% confidence)
                  </span>
                )}
              </p>
              <p className="text-sm text-green-700">{transcript}</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-blue-700">Processing voice input...</p>
        </div>
      )}

      {/* Usage Tips */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Tips for better recognition:</strong></p>
        <ul className="ml-4 space-y-1">
          <li>• Speak clearly and at normal pace</li>
          <li>• Use phrases like "Create task: Math homework due tomorrow"</li>
          <li>• Include priority: "High priority" or "Low priority"</li>
          <li>• Mention subjects: "Math", "Science", "English"</li>
        </ul>
      </div>
    </div>
  );
}; 