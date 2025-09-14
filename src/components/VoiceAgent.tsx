import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ChatMessage } from './ChatMessage';
import { JarvisAvatar } from './JarvisAvatar';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'jarvis';
  timestamp: Date;
}

interface VoiceAgentProps {
  webhookUrl?: string;
  onMessage?: (message: Message) => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ 
  webhookUrl = 'https://your-webhook-endpoint.com/api/voice',
  onMessage 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello, I'm Jarvis. How can I assist you today?",
      sender: 'jarvis',
      timestamp: new Date()
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          content: transcript,
          sender: 'user',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        onMessage?.(userMessage);
        
        // Send to webhook and get response
        await sendToWebhook(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Speech Recognition Error",
          description: "There was an issue with speech recognition. Please try again.",
          variant: "destructive"
        });
        setIsListening(false);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsRecording(false);
      };
    }
  }, [onMessage]);

  // Send transcribed message to webhook
  const sendToWebhook = async (transcript: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          timestamp: new Date().toISOString(),
          user_id: 'user_' + Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Webhook request failed');
      }

      const data = await response.json();
      
      // Add Jarvis response
      const jarvisMessage: Message = {
        id: Date.now().toString(),
        content: data.response || "I'm processing your request. Please wait a moment.",
        sender: 'jarvis',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, jarvisMessage]);
      onMessage?.(jarvisMessage);

      // Optional: Use text-to-speech for Jarvis response
      if ('speechSynthesis' in window && data.response) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.voice = speechSynthesis.getVoices().find(voice => 
          voice.name.includes('Google') || voice.name.includes('Microsoft')
        ) || speechSynthesis.getVoices()[0];
        utterance.rate = 0.9;
        utterance.pitch = 0.8;
        speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('Webhook error:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm experiencing some technical difficulties. Please check your connection and try again.",
        sender: 'jarvis',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Connection Error",
        description: "Unable to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      if (!recognitionRef.current) {
        initializeSpeechRecognition();
      }

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsRecording(true);
      recognitionRef.current?.start();
      
      toast({
        title: "Listening...",
        description: "Speak now. I'm listening to your request.",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [initializeSpeechRecognition]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Jarvis Avatar and Title */}
        <div className="text-center space-y-4">
          <JarvisAvatar isProcessing={isProcessing} isListening={isListening} />
          <div>
            <h1 className="text-4xl font-bold text-glow mb-2">JARVIS</h1>
            <p className="text-muted-foreground">Your AI Voice Assistant</p>
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="card-gradient p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isProcessing && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Processing your request...</span>
              </div>
            )}
          </div>
        </Card>

        {/* Voice Controls */}
        <div className="flex flex-col items-center space-y-4">
          <Button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`
              w-20 h-20 rounded-full transition-all duration-300 border-2
              ${isRecording 
                ? 'bg-destructive hover:bg-destructive/90 border-destructive animate-pulse-glow' 
                : 'bg-primary hover:bg-primary/90 border-primary glow-primary hover:glow-secondary'
              }
            `}
          >
            {isRecording ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isRecording ? 'Recording... Click to stop' : 'Click to start speaking'}
            </p>
            {isListening && (
              <p className="text-xs text-primary animate-pulse">
                Listening for your voice...
              </p>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex justify-center space-x-6 text-sm">
          <div className={`flex items-center space-x-2 ${
            isRecording ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isRecording ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'
            }`} />
            <span>Recording</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${
            isProcessing ? 'text-primary' : 'text-muted-foreground'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isProcessing ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
            }`} />
            <span>Processing</span>
          </div>
          
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Volume2 className="w-3 h-3" />
            <span>Audio Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};