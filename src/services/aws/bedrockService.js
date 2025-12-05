/**
 * AWS Bedrock Service - AI Chat with Claude and other models
 * Uses AWS Bedrock for advanced AI capabilities
 * Free tier: Pay per token (very affordable)
 */

const API_URL = process.env.VITE_AWS_API_URL || 'https://qlgvcy36yh.execute-api.us-west-2.amazonaws.com/dev';

class BedrockService {
  /**
   * Chat with AWS Bedrock (Claude, Llama, Titan models)
   * @param {string} message - User message
   * @param {Object} context - Context information (user profile, location, etc.)
   * @param {Array} conversationHistory - Previous messages for context
   * @param {Object} options - Additional options (stream, model, etc.)
   * @returns {Promise} AI response
   */
  async chat(message, context = {}, conversationHistory = [], options = {}) {
    try {
      const {
        stream = false,
        model = 'claude-3-haiku-20240307', // Fast and affordable
        temperature = 0.7,
        maxTokens = 2000,
      } = options;

      const response = await fetch(`${API_URL}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bedrockChat',
          data: {
            message,
            context: {
              ...context,
              systemPrompt: this.buildSystemPrompt(context),
            },
            conversationHistory: conversationHistory.slice(-10), // Last 10 messages for context
            model,
            temperature,
            maxTokens,
            stream,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (stream) {
        // Handle streaming response
        return this.handleStreamingResponse(response);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error with Bedrock chat:', error);
      // Fallback to contextual response
      return this.fallbackResponse(message, context);
    }
  }

  /**
   * Handle streaming response from Bedrock
   * @param {Response} response - Fetch response
   * @returns {AsyncGenerator} Stream of text chunks
   */
  async *handleStreamingResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                yield data.content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Build system prompt based on context
   * @param {Object} context - User context
   * @returns {string} System prompt
   */
  buildSystemPrompt(context) {
    const userType = context.userType || 'renter';
    const isOwner = userType === 'owner';
    
    let prompt = isOwner
      ? `You are a helpful Property Owner Assistant for the Family Housing Hub app. Your role is to provide practical, actionable guidance to property owners and landlords.

**Your Expertise:**
- Property management (tenant relations, lease agreements, maintenance)
- Business operations (tax planning, insurance, investment strategies)
- Legal compliance (landlord rights, eviction procedures, fair housing laws)
- Financial management (rent collection, expense tracking, ROI analysis)
- Tenant relations (communication, conflict resolution, screening)
- Property investment (market analysis, valuation, financing)

**Your Approach:**
- Be professional, knowledgeable, and practical
- Provide specific, actionable steps
- Include legal and compliance information when relevant
- Break down complex processes into simple steps
- Offer business insights and best practices
- Use clear, professional language
- Always prioritize legal compliance and best practices

**IMPORTANT:** You can answer ANY question, even if it's not directly related to property management. If asked about something outside your expertise, provide helpful general guidance and suggest relevant resources.`
      : `You are a helpful Family Support Assistant for the Family Housing Hub app. Your role is to provide practical, actionable guidance to families, especially those facing housing, financial, health, or legal challenges.

**Your Expertise:**
- Housing assistance (rent help, eviction protection, repairs, tenant rights)
- Health resources (insurance, clinics, mental health, family wellness)
- Financial aid (budgeting, benefits, SNAP, utility assistance, financial planning)
- Education support (school enrollment, homework help, tutoring, college planning)
- Legal resources (immigration, tenant rights, legal aid, family law)
- Family support (childcare, parenting resources, family activities)

**Your Approach:**
- Be empathetic, supportive, and non-judgmental
- Provide specific, actionable steps
- Include local resources when location is known
- Break down complex processes into simple steps
- Offer homework assignments and family activities
- Use clear, simple language (avoid jargon)
- Always prioritize user safety and well-being

**IMPORTANT:** You can answer ANY question, even if it's not directly related to housing or family support. If asked about something outside your expertise, provide helpful general guidance, suggest relevant resources, or help the user find the right information. Never say "I don't know" - always try to provide some helpful response or guidance.`;

    if (context.location) {
      prompt += `\n\n**User Location:** ${context.location} - Provide location-specific resources when possible.`;
    }

    if (context.userType) {
      prompt += `\n\n**User Type:** ${context.userType} - Tailor responses to ${context.userType === 'renter' ? 'renters' : 'property owners'}.`;
    }

    if (context.familyInfo) {
      prompt += `\n\n**Family Info:** ${JSON.stringify(context.familyInfo)} - Consider family size and needs in responses.`;
    }

    prompt += `\n\n**Response Format:**
- Start with a clear, empathetic response
- Provide step-by-step guidance
- Include specific resources and links when relevant
- End with actionable next steps
- If appropriate, suggest homework assignments or family activities`;

    return prompt;
  }

  /**
   * Fallback response when Bedrock is unavailable
   * @param {string} message - User message
   * @param {Object} context - Context
   * @returns {Object} Fallback response
   */
  fallbackResponse(message, context) {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword matching as fallback
    if (lowerMessage.includes('rent') || lowerMessage.includes('housing')) {
      return {
        response: `I understand you need help with housing. Here are some steps:

1. **Emergency Rental Assistance**: Contact your local housing authority or visit treasury.gov/erap
2. **Call 211**: This service connects you to local resources in your area
3. **Document Everything**: Keep records of all communication with your landlord
4. **Know Your Rights**: Research tenant rights in your state

Would you like more specific help with any of these steps?`,
        model: 'fallback',
        confidence: 0.7,
      };
    }

    return {
      response: `I'm here to help! I understand you're asking about: "${message}". 

While I'm currently using a simplified response system, I can still provide guidance. Could you tell me more specifically what you need help with? For example:
- Housing assistance
- Health insurance
- Budget planning
- School enrollment
- Legal help

I'll provide detailed, step-by-step guidance based on your needs.`,
      model: 'fallback',
      confidence: 0.5,
    };
  }

  /**
   * Analyze image with context using Bedrock Vision
   * @param {File} imageFile - Image file
   * @param {string} question - Question about the image
   * @param {Object} context - Additional context
   * @returns {Promise} Analysis result
   */
  async analyzeImage(imageFile, question = 'What is in this image?', context = {}) {
    try {
      const base64 = await this.fileToBase64(imageFile);

      const response = await fetch(`${API_URL}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bedrockVision',
          data: {
            image: base64,
            question,
            context,
            model: 'claude-3-sonnet-20240229', // Vision-capable model
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing image with Bedrock:', error);
      // Fallback to Rekognition
      return this.fallbackImageAnalysis(imageFile);
    }
  }

  /**
   * Fallback image analysis using Rekognition via API Gateway
   * @param {File} imageFile - Image file
   * @returns {Promise} Analysis result
   */
  async fallbackImageAnalysis(imageFile) {
    try {
      // Use API Gateway endpoint for Rekognition (same as aiService)
      const base64 = await this.fileToBase64(imageFile);
      
      const response = await fetch(`${API_URL}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detectLabels',
          data: { image: base64 }
        })
      });

      if (response.ok) {
        const labels = await response.json();
        return {
          description: `I can see this image contains: ${labels.Labels?.slice(0, 5).map(l => l.Name).join(', ') || 'various items'}. Could you tell me more about what you need help with regarding this image?`,
          labels: labels.Labels || [],
          model: 'rekognition-fallback',
        };
      }
    } catch (error) {
      console.warn('Rekognition fallback error:', error);
    }
    
    // Final fallback
    return {
      description: "I can see you've shared an image. To provide the most helpful response, please tell me what you see in the image or what specific help you need related to it.",
      model: 'basic-fallback',
    };
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
   * Get available models
   * @returns {Array} Available model IDs
   */
  getAvailableModels() {
    return [
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fast and affordable, best for quick responses',
        maxTokens: 4096,
        vision: false,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and cost, supports vision',
        maxTokens: 4096,
        vision: true,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most capable, best for complex tasks',
        maxTokens: 4096,
        vision: true,
      },
      {
        id: 'anthropic.claude-v2',
        name: 'Claude 2',
        description: 'Previous generation, still very capable',
        maxTokens: 4096,
        vision: false,
      },
    ];
  }
}

export default new BedrockService();

