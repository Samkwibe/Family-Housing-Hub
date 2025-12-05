/**
 * AWS Amplify Configuration
 * This initializes Amplify with Cognito settings from Amplify CLI
 */

import { Amplify } from 'aws-amplify';
import awsconfig from '../../aws-exports';

// Configure Amplify with auto-generated config from Amplify CLI
Amplify.configure(awsconfig);

export default Amplify;


