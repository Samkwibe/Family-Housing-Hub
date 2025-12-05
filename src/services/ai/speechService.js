/**
 * Speech Service - AWS Polly Integration
 * Handles text-to-speech conversion for AI responses
 */

import AWS_CONFIG from '../aws/config';

class SpeechService {
  constructor() {
    this.synthesis = null;
    this.isSpeaking = false;
    
    // Initialize Web Speech API (browser-native, free)
    this.initWebSpeechAPI();
  }

  /**
   * Initialize Web Speech API (browser-native, free)
   * Falls back to AWS Polly if needed
   */
  initWebSpeechAPI() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Speak text using available method
   * @param {string} text - Text to speak
   * @param {Object} options - Voice options
   */
  async speak(text, options = {}) {
    if (!text) return;

    // Use Web Speech API if available (free, no AWS needed)
    if (this.synthesis) {
      return this.speakWithWebAPI(text, options);
    }

    // Fallback to AWS Polly via API Gateway
    return this.speakWithAWSPolly(text, options);
  }

  /**
   * Speak using Web Speech API (free)
   */
  speakWithWebAPI(text, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice options
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = options.lang || 'en-US';

        // Try to use a natural-sounding voice
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Google') || 
          voice.name.includes('Samantha') ||
          voice.name.includes('Alex')
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          this.isSpeaking = false;
          resolve();
        };

        utterance.onerror = (error) => {
          this.isSpeaking = false;
          reject(error);
        };

        this.isSpeaking = true;
        this.synthesis.speak(utterance);
      } catch (error) {
        this.isSpeaking = false;
        reject(error);
      }
    });
  }

  /**
   * Speak using AWS Polly (via API Gateway)
   */
  async speakWithAWSPolly(text, options = {}) {
    try {
      const apiUrl = AWS_CONFIG.apiGateway.baseUrl;
      if (!apiUrl) {
        throw new Error('AWS API Gateway URL not configured');
      }

      const response = await fetch(`${apiUrl}/polly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: options.voiceId || AWS_CONFIG.services.polly.voiceId,
          engine: options.engine || AWS_CONFIG.services.polly.engine,
          languageCode: options.languageCode || AWS_CONFIG.services.polly.languageCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Speech synthesis failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      this.isSpeaking = true;

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          this.isSpeaking = false;
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = (error) => {
          this.isSpeaking = false;
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };

        audio.play();
      });
    } catch (error) {
      console.error('Error with AWS Polly:', error);
      this.isSpeaking = false;
      throw error;
    }
  }

  /**
   * Stop speaking
   */
  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Check if speech synthesis is supported
   */
  isSupported() {
    return 'speechSynthesis' in window || !!AWS_CONFIG.apiGateway.baseUrl;
  }

  /**
   * Get available voices (Web Speech API)
   */
  getVoices() {
    if (!this.synthesis) return [];
    
    return this.synthesis.getVoices();
  }
}

// Export singleton instance
export default new SpeechService();


