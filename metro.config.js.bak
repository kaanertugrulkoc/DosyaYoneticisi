const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
    resolver: {
        blacklistRE: /android\/.*|ios\/.*|node_modules\/.*\/node_modules\/.*/,
    },
    watchFolders: [__dirname],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

