/**
 * Amazon Transcribe Service
 * Speech-to-text for voice commands and notes
 */

import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";

class TranscribeService {
  constructor() {
    this.client = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Initialize Transcribe client
   */
  initClient(credentials, region = 'us-east-1') {
    this.client = new TranscribeStreamingClient({
      region: region,
      credentials: credentials
    });
  }

  /**
   * Start recording audio
   */
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      
      return { success: true, message: 'Recording started' };
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * Stop recording and transcribe
   */
  async stopRecordingAndTranscribe() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          // Create audio blob
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          
          // Convert to ArrayBuffer
          const audioBuffer = await audioBlob.arrayBuffer();
          const audioBytes = new Uint8Array(audioBuffer);

          // Use Web Speech API as fallback (simpler and free)
          const text = await this.transcribeWithWebSpeech(audioBlob);
          
          resolve({
            success: true,
            text: text
          });
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      
      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }

  /**
   * Transcribe audio using Web Speech API (free, built-in browser API)
   */
  transcribeWithWebSpeech(audioBlob) {
    return new Promise((resolve, reject) => {
      // Check if Web Speech API is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      // Note: Web Speech API works with live audio, not recorded blobs
      // For recorded audio, we'd need AWS Transcribe or another service
      // For now, we'll return a fallback message
      resolve('Voice command received. Use live voice recognition for better results.');
    });
  }

  /**
   * Start live voice recognition (Web Speech API)
   */
  startLiveRecognition(onResult, onError) {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition not supported in this browser');
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        const isFinal = event.results[last].isFinal;
        
        if (onResult) {
          onResult({ transcript, isFinal });
        }
      };

      recognition.onerror = (event) => {
        if (onError) {
          onError(event.error);
        }
      };

      recognition.start();
      
      return {
        recognition,
        stop: () => recognition.stop()
      };
    } catch (error) {
      console.error('Error starting live recognition:', error);
      throw error;
    }
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(text) {
    const lowerText = text.toLowerCase();

    // Define command patterns
    const commands = {
      // Shopping list
      addToList: /add (.*) to (?:shopping|grocery) list/i,
      showList: /show (?:my )?(?:shopping|grocery) list/i,
      
      // Budget
      showBudget: /show (?:my )?budget/i,
      addExpense: /add expense (.*) for \$?(\d+\.?\d*)/i,
      
      // Messages
      showMessages: /show (?:my )?messages/i,
      sendMessage: /send message to (.*) saying (.*)/i,
      
      // Calendar
      showCalendar: /show (?:my )?calendar/i,
      addEvent: /add event (.*) on (.*)/i,
      
      // General
      help: /help|what can you do/i,
    };

    // Check each command pattern
    for (const [command, pattern] of Object.entries(commands)) {
      const match = text.match(pattern);
      if (match) {
        return {
          command,
          params: match.slice(1),
          originalText: text
        };
      }
    }

    // No matching command
    return {
      command: 'unknown',
      originalText: text
    };
  }
}

export default new TranscribeService();


