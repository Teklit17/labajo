const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Firebase v9+ uses package exports — Metro needs this disabled to resolve it correctly
config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push('cjs');

module.exports = withNativeWind(config, { input: './global.css' });
