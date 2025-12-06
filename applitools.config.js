// Applitools Configuration
// API key is loaded from .env file

export const applitoolsConfig = {
  apiKey: process.env.APPLITOOLS_API_KEY || '',
  
  // Batch configuration
  batch: {
    name: 'Family Housing Hub Tests',
    id: process.env.CI ? process.env.GITHUB_RUN_ID : `local-${Date.now()}`,
  },
  
  // App name
  appName: 'Family Housing Hub',
  
  // Test configuration
  testName: 'Visual Regression Tests',
  
  // Browser configuration
  browsers: [
    { width: 1920, height: 1080, name: 'chrome' },
    { width: 1920, height: 1080, name: 'firefox' },
    { width: 1920, height: 1080, name: 'edgechromium' },
    { width: 375, height: 667, name: 'chrome' }, // Mobile
    { width: 390, height: 844, name: 'chrome' }, // iPhone
  ],
  
  // Match level (how strict visual comparison should be)
  matchLevel: 'Strict', // Options: Exact, Strict, Content, Layout
  
  // Accessibility testing
  accessibility: {
    level: 'AA', // WCAG AA compliance
    guidelinesVersion: 'WCAG_2_1'
  }
};

