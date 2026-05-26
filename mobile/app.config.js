/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const googleMapsApiKey = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();

/** @param {string | undefined} raw */
function isUsableMapsKey(raw) {
  const value = (raw ?? '').trim();
  if (!value) return false;
  if (/^your[_-]/i.test(value)) return false;
  if (/placeholder|example|changeme|xxx/i.test(value)) return false;
  if (value.length < 20) return false;
  return true;
}

const hasGoogleMapsKey = isUsableMapsKey(googleMapsApiKey);

module.exports = {
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    ...(hasGoogleMapsKey
      ? {
          config: {
            ...(appJson.expo.android?.config ?? {}),
            googleMaps: {
              apiKey: googleMapsApiKey,
            },
          },
        }
      : {}),
  },
  ios: {
    ...appJson.expo.ios,
    ...(hasGoogleMapsKey
      ? {
          config: {
            ...(appJson.expo.ios?.config ?? {}),
            googleMapsApiKey: googleMapsApiKey,
          },
        }
      : {}),
  },
  extra: {
    ...appJson.expo.extra,
    eas: {
      ...(appJson.expo.extra?.eas ?? {}),
      projectId: "a18d75e9-1069-499c-bbd0-cc7cc7dc0c18",
    },
    ...(hasGoogleMapsKey ? { googleMapsApiKey: googleMapsApiKey } : {}),
  },
};
