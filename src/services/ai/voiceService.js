/**
 * Voice Service - AWS Transcribe Integration
 * Handles speech-to-text conversion for voice commands
 */

import AWS_CONFIG from '../aws/config';

class VoiceService {
  constructor() {
    this.isListening = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recognition = null;
    
    // Initialize Web Speech API as fallback
    this.initWebSpeechAPI();
  }

  /**
   * Initialize Web Speech API (browser-native, free)
   * Falls back to AWS Transcribe if needed
   */
  initWebSpeechAPI() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.onTranscript(transcript);
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.onError(event.error);
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  /**
   * Start listening for voice input
   * @param {Function} onTranscript - Callback when transcript is received
   * @param {Function} onError - Callback for errors
   */
  startListening(onTranscript, onError) {
    this.onTranscript = onTranscript;
    this.onError = onError;

    // Use Web Speech API if available (free, no AWS needed)
    if (this.recognition) {
      try {
        this.recognition.start();
        this.isListening = true;
        return { success: true, method: 'web-speech-api' };
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        return { success: false, error: error.message };
      }
    }

    // Fallback to AWS Transcribe via API Gateway
    return this.startAWSTranscribe(onTranscript, onError);
  }

  /**
   * Start AWS Transcribe (via API Gateway)
   */
  async startAWSTranscribe(onTranscript, onError) {
    try {
      // Start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const transcript = await this.sendToAWSTranscribe(audioBlob);
        if (transcript) {
          onTranscript(transcript);
        } else {
          onError('Failed to transcribe audio');
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isListening = true;
      
      return { success: true, method: 'aws-transcribe' };
    } catch (error) {
      console.error('Error starting AWS Transcribe:', error);
      onError(error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isListening = false;
    }
  }

  /**
   * Send audio to AWS Transcribe via API Gateway
   */
  async sendToAWSTranscribe(audioBlob) {
    try {
      const apiUrl = AWS_CONFIG.apiGateway.baseUrl;
      if (!apiUrl) {
        throw new Error('AWS API Gateway URL not configured');
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('languageCode', AWS_CONFIG.services.transcribe.languageCode);

      const response = await fetch(`${apiUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      return data.transcript;
    } catch (error) {
      console.error('Error sending to AWS Transcribe:', error);
      return null;
    }
  }

  /**
   * Check if voice recognition is supported
   */
  isSupported() {
    return (
      'webkitSpeechRecognition' in window ||
      'SpeechRecognition' in window ||
      navigator.mediaDevices?.getUserMedia
    );
  }

  /**
   * Get available methods
   */
  getAvailableMethods() {
    const methods = [];
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      methods.push('web-speech-api');
    }
    
    if (AWS_CONFIG.apiGateway.baseUrl) {
      methods.push('aws-transcribe');
    }
    
    return methods;
  }
}

// Export singleton instance
export default new VoiceService();


