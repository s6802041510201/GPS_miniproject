const androidMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
const iosMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY;

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    package: process.env.EXPO_ANDROID_PACKAGE || 'com.kmutnb.geoattendance',
  },
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.EXPO_IOS_BUNDLE_IDENTIFIER || 'com.kmutnb.geoattendance',
  },
  plugins: [
    ...(config.plugins || []),
    'expo-font',
    ...(androidMapsApiKey || iosMapsApiKey
      ? [[
          'react-native-maps',
          {
            ...(androidMapsApiKey ? { androidGoogleMapsApiKey: androidMapsApiKey } : {}),
            ...(iosMapsApiKey ? { iosGoogleMapsApiKey: iosMapsApiKey } : {}),
          },
        ]]
      : []),
  ],
});
