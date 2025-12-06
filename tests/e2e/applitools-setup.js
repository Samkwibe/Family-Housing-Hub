// Applitools setup for Playwright tests
import { Eyes, ClassicRunner, Configuration, BatchInfo, BrowserType } from '@applitools/eyes-playwright';

// Initialize Eyes
export function createEyes() {
  const eyes = new Eyes();
  
  // Set API key from environment
  if (process.env.APPLITOOLS_API_KEY) {
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
  }
  
  // Create configuration
  const configuration = new Configuration();
  
  // Set batch info
  configuration.setBatch(new BatchInfo('Family Housing Hub Tests'));
  
  // Set app name
  configuration.setAppName('Family Housing Hub');
  
  // Add browsers for cross-browser testing
  configuration.addBrowser(1920, 1080, BrowserType.CHROME);
  configuration.addBrowser(1920, 1080, BrowserType.FIREFOX);
  configuration.addBrowser(1920, 1080, BrowserType.EDGE_CHROMIUM);
  configuration.addBrowser(375, 667, BrowserType.CHROME); // Mobile
  configuration.addBrowser(390, 844, BrowserType.CHROME); // iPhone
  
  // Set match level
  configuration.setMatchLevel('Strict');
  
  // Apply configuration
  eyes.setConfiguration(configuration);
  
  return eyes;
}

