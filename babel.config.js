module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      [
        'babel-plugin-module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/services': './src/services',
            '@/utils': './src/utils',
            '@/hooks': './src/hooks',
            '@/stores': './src/stores',
            '@/config': './src/config',
            '@/types': './src/types',
          },
        },
      ],
      // Production optimizations
      process.env.NODE_ENV === 'production' && [
        'transform-remove-console',
        { exclude: ['error', 'warn'] },
      ],
      process.env.NODE_ENV === 'production' && 'babel-plugin-minify-dead-code-elimination',
    ].filter(Boolean),
  };
};