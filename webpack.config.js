const currentTask = process.env.npm_lifecycle_event;
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const cssnano = require('cssnano');
const fse = require('fs-extra');
const postCSSPlugins = [
  require('postcss-import'),
  require('postcss-mixins'),
  require('postcss-simple-vars'),
  require('postcss-nested'),
  require('autoprefixer'),
];

class RunAfterCompile {
  apply(compiler) {
    compiler.hooks.done.tap('Copy images', function () {
      fse.copySync('./app/assets/images', './dist/assets/images');
    });
  }
}

let jsConfig = {
  test: /\.js$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env'],
    },
  },
};

let cssConfig = {
  test: /\.css$/i,
  use: [
    { loader: 'css-loader', options: { url: false } },
    { loader: 'postcss-loader', options: { postcssOptions: { plugins: postCSSPlugins } } },
  ],
};

let pages = fse
  .readdirSync('./app')
  .filter(function (file) {
    return file.endsWith('.html');
  })
  .map(function (page) {
    return new HtmlWebpackPlugin({ filename: page, template: `./app/${page}`, inject: true });
  });

let config = {
  entry: './app/assets/scripts/App.js',
  plugins: pages,
  module: {
    rules: [cssConfig, jsConfig],
  },
};

if (currentTask == 'dev') {
  cssConfig.use.unshift('style-loader');
  config.output = {
    filename: 'bundled.js',
    path: path.resolve(__dirname, 'app'),
  };
  config.devServer = {
    watchFiles: ['app/**/*.html'],
    static: {
      directory: path.join(__dirname, 'app'),
    },
    hot: true,
    port: 3010,
  };
  config.mode = 'development';
}

if (currentTask == 'build') {
  // config.module.rules.push(jsConfig);
  cssConfig.use.unshift(MiniCssExtractPlugin.loader);
  postCSSPlugins.push(require('cssnano'));
  config.output = {
    filename: '[name].[chunkhash].js',
    chunkFilename: '[name].[chunkhash].js',
    path: path.resolve(__dirname, 'dist'),
  };
  config.mode = 'production';
  config.optimization = {
    splitChunks: { chunks: 'all', minSize: 1000 },
    minimize: true,
    minimizer: [`...`, new CssMinimizerPlugin()],
  };

  config.plugins.push(
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({ filename: 'styles.[chunkhash].css' }),
    new RunAfterCompile()
  );
}

module.exports = config;
