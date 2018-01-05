const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const tsConfig = require('./tsconfig.json');


module.exports = function(env={}) {
  const entry = env.entry || './restcountries/index.tsx';
  return {
    context: path.resolve(__dirname),
    entry: { entry: [entry], },
    output: {
      path: path.join(__dirname, 'public'),
      filename: '[name].bundle.js',
    },
    module: {
      loaders: [{
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          compilerOptions: tsConfig.compilerOptions,
          transpileOnly: env.hasOwnProperty('transpileOnly') ? env.transpileOnly : true,
        },
      }, {
        test: /\.md$/,
        use: [
          {
            loader: 'html-loader'
          },
          {
            loader: 'markdown-loader',
          }
        ]
      }],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
    },
    devServer: {
      historyApiFallback: { index: 'index.html'},
    },
    node: {
      fs: 'empty',
      path: 'empty',
      child_process: 'empty',
    },
  };
};
