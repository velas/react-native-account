module.exports = {
  extends: ['@react-native-community', 'prettier'],
  ignorePatterns: ['docs/*'],
  rules: {
    'react-native/no-unused-styles': 2,
    'react/jsx-filename-extension': [
      1,
      {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
    'prettier/prettier': [
      'error',
      {
        trailingComma: 'es5',
        printWidth: 100,
        tabWidth: 2,
        semi: false,
        singleQuote: true,
      },
    ],
  },
  plugins: ['prettier'],
}
