// src/components/VoiceRecorder.jsx
// Enhanced voice recording component with better UI and playback

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import errorLogger from '../services/errorLoggingService';

const VoiceRecorder = ({ onRecordingComplete, onCancel, maxDuration = 60 }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);
        setDuration(0);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
            toast.info(`Recording stopped at ${maxDuration} seconds`);
          }
          return newDuration;
        });
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      errorLogger.logError(error, {
        component: 'VoiceRecorder',
        action: 'startRecording',
      });
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      toast.success('Recording stopped');
    }
  };

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSend = () => {
    if (audioBlob && onRecordingComplete) {
      onRecordingComplete(audioBlob, duration);
    }
  };

  const handleDelete = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      {!audioBlob ? (
        // Recording UI
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <>
              <button
                onClick={startRecording}
                className="flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                aria-label="Start recording"
              >
                <Mic className="h-6 w-6" />
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tap to record voice message
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Max {maxDuration} seconds
                </p>
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors animate-pulse"
                aria-label="Stop recording"
              >
                <Square className="h-6 w-6" />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Recording... {formatTime(duration)}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tap stop when finished
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        // Playback UI
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={playRecording}
              className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Voice message ({formatTime(duration)})
                </p>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={handleAudioEnded}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
              />
            </div>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Delete recording"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

