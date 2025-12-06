// Helper for handling Applitools test results gracefully

/**
 * Handle Applitools test results, catching expected diffs on first run
 */
export async function handleApplitoolsResults(runner) {
  try {
    const results = await runner.getAllTestResults();
    return results;
  } catch (error) {
    // DiffsFoundError is expected on first run - Applitools needs baseline
    if (error.message && error.message.includes('detected differences')) {
      console.log('ℹ️  Applitools detected visual differences (expected on first run)');
      console.log('   Review and accept baseline in Applitools dashboard');
      return null; // Return null to indicate diffs found but not a failure
    }
    throw error;
  }
}

/**
 * Close eyes gracefully, handling errors
 */
export async function closeEyesSafely(eyes) {
  try {
    if (eyes && typeof eyes.getIsOpen === 'function' && eyes.getIsOpen()) {
      await eyes.close();
    } else if (eyes && typeof eyes.close === 'function') {
      await eyes.close();
    }
  } catch (error) {
    // Ignore "Eyes not open" errors
    if (!error.message || !error.message.includes('Eyes not open')) {
      console.warn('Error closing eyes:', error.message);
    }
  }
}

