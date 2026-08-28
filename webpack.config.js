const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode || 'development',
    entry: {
      main: './index.js',
      dashboard: './aviator-dashboard.html',
      predictor: './js/aviator-predictor.js',
      interceptor: './js/httpcanary-interceptor.js',
      bot: './js/trading-bot.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
      clean: true,
      publicPath: '/'
    },
    devtool: isDevelopment ? 'source-map' : false,
    devServer: {
      port: 8080,
      hot: true,
      historyApiFallback: true,
      compress: true,
      open: true,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json', '.html'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
              cacheDirectory: true
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.html$/,
          use: ['html-loader']
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024
            }
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './aviator-dashboard.html',
        filename: 'index.html',
        chunks: ['main', 'dashboard'],
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true
        } : false
      }),
      isProduction && new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[name].[contenthash:8].chunk.css'
      }),
      isProduction && new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'bundle-report.html'
      })
    ].filter(Boolean),
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction
            },
            output: {
              comments: false
            }
          },
          extractComments: false
        })
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      },
      runtimeChunk: {
        name: 'runtime'
      }
    },
    performance: {
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  };
};
