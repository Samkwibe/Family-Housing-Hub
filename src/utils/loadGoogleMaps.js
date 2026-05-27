/** Load Google Maps JS API using VITE_GOOGLE_MAPS_API_KEY (never hardcode keys). */
let loadPromise;

export function loadGoogleMaps() {
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve();
  }

  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured'));
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window.initGoogleMaps = () => {
      window.googleMapsLoaded = true;
      window.dispatchEvent(new Event('googlemapsloaded'));
      resolve();
    };

    window.handleGoogleMapsError = () => {
      window.googleMapsError = true;
      window.dispatchEvent(new Event('googlemapserror'));
      reject(new Error('Google Maps API failed to load'));
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => window.handleGoogleMapsError();
    document.head.appendChild(script);
  });

  return loadPromise;
}
