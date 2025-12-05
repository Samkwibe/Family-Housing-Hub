/**
 * AWS Service Configuration
 * Configure AWS services for Family Housing Hub
 * Uses AWS Free Tier where possible
 */

// AWS Configuration
// Note: In production, use environment variables for credentials
// Never commit actual AWS credentials to version control

export const AWS_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  
  // AWS Services Configuration
  services: {
    // Amazon Polly (Text-to-Speech)
    polly: {
      enabled: true,
      voiceId: 'Joanna', // Natural female voice
      engine: 'neural', // Neural engine for better quality
      languageCode: 'en-US',
      freeTierLimit: 5000000, // 5M characters/month
    },
    
    // Amazon Transcribe (Speech-to-Text)
    transcribe: {
      enabled: true,
      languageCode: 'en-US',
      sampleRate: 44100,
      freeTierLimit: 60, // 60 minutes/month
    },
    
    // Amazon Comprehend (NLP)
    comprehend: {
      enabled: true,
      languageCode: 'en',
      freeTierLimit: 50000, // 50K units/month
    },
    
    // Amazon Rekognition (Image Analysis)
    rekognition: {
      enabled: true,
      freeTierLimit: 5000, // 5K images/month
    },
    
    // Amazon S3 (Storage)
    s3: {
      enabled: true,
      bucketName: import.meta.env.VITE_AWS_S3_BUCKET || 'family-hub-storage',
      freeTierStorage: 5 * 1024 * 1024 * 1024, // 5GB
      freeTierRequests: 20000, // 20K GET requests
    },
    
    // AWS Lambda (Serverless Functions)
    lambda: {
      enabled: true,
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      freeTierRequests: 1000000, // 1M requests/month
    },
    
    // Amazon DynamoDB (NoSQL Database)
    dynamoDB: {
      enabled: true,
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      freeTierStorage: 25 * 1024 * 1024 * 1024, // 25GB
    },
  },
  
  // API Gateway Configuration
  apiGateway: {
    baseUrl: import.meta.env.VITE_AWS_API_URL || '',
    freeTierLimit: 1000000, // 1M API calls/month
  },
};

/**
 * Initialize AWS SDK
 * Note: For browser usage, we'll use API Gateway endpoints
 * Direct AWS SDK usage should be done server-side (Lambda functions)
 */
export const initializeAWS = () => {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    console.log('✅ AWS services configured for browser usage via API Gateway');
    return {
      initialized: true,
      method: 'api-gateway',
    };
  }
  
  // Server-side initialization would go here
  return {
    initialized: true,
    method: 'direct',
  };
};

/**
 * Check if service is within free tier limits
 */
export const checkFreeTierLimit = (service, usage) => {
  const config = AWS_CONFIG.services[service];
  if (!config || !config.freeTierLimit) return true;
  
  return usage < config.freeTierLimit;
};

/**
 * Get service status
 */
export const getServiceStatus = () => {
  return {
    polly: AWS_CONFIG.services.polly.enabled,
    transcribe: AWS_CONFIG.services.transcribe.enabled,
    comprehend: AWS_CONFIG.services.comprehend.enabled,
    rekognition: AWS_CONFIG.services.rekognition.enabled,
    s3: AWS_CONFIG.services.s3.enabled,
    lambda: AWS_CONFIG.services.lambda.enabled,
    dynamoDB: AWS_CONFIG.services.dynamoDB.enabled,
  };
};

export default AWS_CONFIG;


