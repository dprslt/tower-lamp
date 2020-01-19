const path = require("path");
const webpack = require("webpack");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: ["./src/index.js"],
  mode: "production",
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env', '@babel/preset-react'],
          plugins: [
            "@babel/plugin-proposal-class-properties"
          ]
        }
      },
      {
        test: /\.(css|scss)$/,
        use: [ 'style-loader', 'css-loader', 'sass-loader', {
          loader: 'postcss-loader',
            options: {
              plugins: function () {
                return [
                  require('autoprefixer')
                ];
              }
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|ttf|eot)$/,
        use: [
            {
                loader: 'file-loader',
                options: {}
            }
          ]
        },
        {
        test: /\.(png|jpeg|jpg|gif|svg)$/i,
        use: [
            {
                loader: 'file-loader',
                options: {}
            }
        ]
      },
      {
        test: /bootstrap\/dist\/js\/umd\//, use: 'imports-loader?jQuery=jquery'
      }
    ]
  },
  resolve: { extensions: ['*', '.js', '.jsx'] },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: "/"
  },
  plugins: [
    new BundleAnalyzerPlugin({
        analyzerMode: 'disabled',
        generateStatsFile: true,
        statsOptions: { source: false }
    }),
    new CleanWebpackPlugin(['dist']),
    new webpack.DefinePlugin({
      API_REST_URL: JSON.stringify('http://lamp/api'),
      BASENAME_URL: JSON.stringify('/')
    }),
    new HtmlWebpackPlugin({
        template: path.resolve(__dirname,'public/index.html'),
        favicon: 'src/assets/favicon.png',
        title: "Lamp"
    }),
    new ManifestPlugin()
  ]
};
