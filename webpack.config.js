const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'vsrc-player.js',
    library: 'VSRCPlayer',
    libraryTarget: 'umd',
    libraryExport: 'default',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  }
};
