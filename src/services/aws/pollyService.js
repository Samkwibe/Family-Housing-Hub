/**
 * Amazon Polly Service
 * Text-to-speech for voice features
 */

import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

class PollyService {
  constructor() {
    this.client = null;
    this.currentAudio = null;
  }

  /**
   * Initialize Polly client
   */
  initClient(credentials, region = 'us-east-1') {
    this.client = new PollyClient({
      region: region,
      credentials: credentials
    });
  }

  /**
   * Convert text to speech
   * @param {string} text - Text to speak
   * @param {string} voiceId - Voice to use (default: Joanna)
   * @returns {Promise<Blob>} Audio blob
   */
  async textToSpeech(text, voiceId = 'Joanna') {
    try {
      if (!this.client) {
        throw new Error('Polly client not initialized');
      }

      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'neural' // Higher quality voice
      });

      const response = await this.client.send(command);
      
      // Convert AudioStream to Blob
      const audioBlob = new Blob([response.AudioStream], { type: 'audio/mpeg' });
      
      return audioBlob;
    } catch (error) {
      console.error('Error converting text to speech:', error);
      // Fallback to standard engine if neural not available
      if (error.message.includes('neural')) {
        return this.textToSpeechStandard(text, voiceId);
      }
      throw new Error(`Failed to convert text to speech: ${error.message}`);
    }
  }

  /**
   * Convert text to speech (standard engine)
   */
  async textToSpeechStandard(text, voiceId = 'Joanna') {
    try {
      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'standard'
      });

      const response = await this.client.send(command);
      const audioBlob = new Blob([response.AudioStream], { type: 'audio/mpeg' });
      
      return audioBlob;
    } catch (error) {
      console.error('Error with standard voice:', error);
      throw error;
    }
  }

  /**
   * Speak text (play audio)
   */
  async speak(text, voiceId = 'Joanna') {
    try {
      // Stop any currently playing audio
      this.stop();

      // Get audio blob
      const audioBlob = await this.textToSpeech(text, voiceId);
      
      // Create audio URL
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.play();

      return { success: true };
    } catch (error) {
      console.error('Error speaking text:', error);
      throw new Error(`Failed to speak text: ${error.message}`);
    }
  }

  /**
   * Stop current audio
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Get available voices
   */
  getVoices() {
    return {
      // US English voices
      'Joanna': { gender: 'Female', language: 'en-US', description: 'Warm, friendly' },
      'Matthew': { gender: 'Male', language: 'en-US', description: 'Professional' },
      'Ivy': { gender: 'Female', language: 'en-US', description: 'Young, energetic' },
      'Joey': { gender: 'Male', language: 'en-US', description: 'Casual, friendly' },
      'Kendra': { gender: 'Female', language: 'en-US', description: 'Clear, articulate' },
      'Kimberly': { gender: 'Female', language: 'en-US', description: 'Warm, expressive' },
      'Salli': { gender: 'Female', language: 'en-US', description: 'Cheerful' },
      'Justin': { gender: 'Male', language: 'en-US', description: 'Young, energetic' },
    };
  }

  /**
   * Announce notification
   */
  async announceNotification(message) {
    const text = `You have a new notification. ${message}`;
    return this.speak(text);
  }

  /**
   * Announce reminder
   */
  async announceReminder(reminder) {
    const text = `Reminder: ${reminder}`;
    return this.speak(text);
  }

  /**
   * Read message aloud
   */
  async readMessage(from, message) {
    const text = `New message from ${from}. ${message}`;
    return this.speak(text);
  }
}

export default new PollyService();


