/**
 * AWS Cognito Configuration
 * Replace Firebase Auth with AWS Cognito
 */

// Your Cognito details from the AWS Console:
// User Pool ID: us-east-1_pNHf3ZUq9
// App Client ID: 2qkhqr39rarvi8bq60bp8jq584
// Region: us-east-1

export const cognitoConfig = {
  userPoolId: 'us-east-1_pNHf3ZUq9',
  clientId: '2qkhqr39rarvi8bq60bp8jq584',
  region: 'us-east-1',
  
  // You need to set up a Cognito Domain first in AWS Console
  // Go to: Cognito → App integration → Domain
  // Create a domain (e.g., family-hub-auth)
  // Then use: family-hub-auth.auth.us-east-1.amazoncognito.com
  // Using Cognito prefix domain (always available)
  // If you created a custom domain, replace this with your custom domain
  domain: process.env.REACT_APP_COGNITO_DOMAIN || 'us-east-1pnhf3zuq9.auth.us-east-1.amazoncognito.com',
  
  // Redirect URLs
  redirectSignIn: process.env.NODE_ENV === 'production' 
    ? 'https://family-housing-hub.web.app'
    : 'http://localhost:5173',
  
  redirectSignOut: process.env.NODE_ENV === 'production'
    ? 'https://family-housing-hub.web.app'
    : 'http://localhost:5173',
  
  // OAuth scopes
  scopes: ['openid', 'email', 'profile', 'phone'],
  
  // Response type
  responseType: 'code'
};

export default cognitoConfig;

