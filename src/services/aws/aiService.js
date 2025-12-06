/**
 * AWS AI Services - Frontend API Client
 * Calls Lambda function via API Gateway
 * All services use AWS Free Tier (first 12 months)
 */

const API_URL = 'https://qlgvcy36yh.execute-api.us-west-2.amazonaws.com/dev';

class AIService {
    /**
     * Scan receipt image with OCR (Amazon Rekognition)
     * Free: 5,000 images/month
     * @param {File} imageFile - Image file
     * @returns {Promise} Receipt data with items, prices, total
     */
    async scanReceipt(imageFile) {
        try {
            const base64 = await this.fileToBase64(imageFile);

            const response = await fetch(`${API_URL}/api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'scanReceipt',
                    data: { image: base64 }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error scanning receipt:', error);
            throw error;
        }
    }

    /**
     * Detect objects in image (Amazon Rekognition)
     * Free: 5,000 images/month
     * @param {File} imageFile - Image file
     * @returns {Promise} Detected labels/objects
     */
    async detectLabels(imageFile) {
        try {
            const base64 = await this.fileToBase64(imageFile);

            const response = await fetch(`${API_URL}/api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'detectLabels',
                    data: { image: base64 }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error detecting labels:', error);
            throw error;
        }
    }

    /**
     * Convert text to speech and play it (Amazon Polly)
     * Free: 5 million characters/month
     * @param {string} text - Text to speak
     * @param {string} voiceId - Voice ID (default: 'Joanna')
     * @returns {Promise} Audio result
     */
    async textToSpeech(text, voiceId = 'Joanna') {
        try {
            const response = await fetch(`${API_URL}/api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'textToSpeech',
                    data: { text, voiceId }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.audio) {
                // Play audio
                const audio = new Audio(`data:audio/mpeg;base64,${result.audio}`);
                await audio.play();
            }

            return result;
        } catch (error) {
            console.error('Error with text to speech:', error);
            throw error;
        }
    }

    /**
     * Get audio blob without playing (Amazon Polly)
     * @param {string} text - Text to convert
     * @param {string} voiceId - Voice ID
     * @returns {Promise<Blob>} Audio blob
     */
    async textToSpeechBlob(text, voiceId = 'Joanna') {
        try {
            const response = await fetch(`${API_URL}/api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'textToSpeech',
                    data: { text, voiceId }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.audio) {
                // Convert base64 to blob
                const binaryString = atob(result.audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return new Blob([bytes], { type: 'audio/mpeg' });
            }

            throw new Error('No audio data received');
        } catch (error) {
            console.error('Error getting audio blob:', error);
            throw error;
        }
    }

    /**
     * Detect sentiment in text (Amazon Comprehend)
     * Free: 50,000 units/month
     * @param {string} text - Text to analyze
     * @returns {Promise} Sentiment analysis (POSITIVE, NEGATIVE, NEUTRAL, MIXED)
     */
    async detectSentiment(text) {
        try {
            const response = await fetch(`${API_URL}/api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'detectSentiment',
                    data: { text }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error detecting sentiment:', error);
            throw error;
        }
    }

    /**
     * Detect entities in text (Amazon Comprehend)
     * Free: 50,000 units/month
     * Finds people, places, organizations, dates, etc.
     * @param {string} text - Text to analyze
     * @returns {Promise} Detected entities
     */
    async detectEntities(text) {
        try {
            const response = await fetch(`${API_URL}/api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'detectEntities',
                    data: { text }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error detecting entities:', error);
            throw error;
        }
    }

    /**
     * Convert file to base64
     * @private
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get available voices for text-to-speech
     */
    getAvailableVoices() {
        return {
            // US English voices
            'Joanna': { gender: 'Female', language: 'en-US', description: 'Warm, friendly (default)' },
            'Matthew': { gender: 'Male', language: 'en-US', description: 'Professional, clear' },
            'Ivy': { gender: 'Female', language: 'en-US', description: 'Young, energetic' },
            'Joey': { gender: 'Male', language: 'en-US', description: 'Casual, friendly' },
            'Kendra': { gender: 'Female', language: 'en-US', description: 'Clear, articulate' },
            'Kimberly': { gender: 'Female', language: 'en-US', description: 'Warm, expressive' },
            'Salli': { gender: 'Female', language: 'en-US', description: 'Cheerful, upbeat' },
            'Justin': { gender: 'Male', language: 'en-US', description: 'Young, energetic' },
        };
    }
}

export default new AIService();






