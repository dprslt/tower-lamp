const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: [ "./src/index.js"],
  mode: "development",
  devtool: 'cheap-module-eval-source-map',
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
                ]
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
    publicPath: "/",
    filename: "bundle.js"
  },
  devServer: {
    contentBase: path.join(__dirname, "dist/"),
    port: 7085,
    publicPath: "http://localhost:3001/",
    historyApiFallback: true,
    hotOnly: true,
/*     proxy: {
      "/route": "http://localhost:5000"
    } */
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      BACKEND_WS_URL: JSON.stringify("192.168.1.2:30008"),
    }),
    new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'dist/index.html'),
        template: path.resolve(__dirname,'public/index.html'),
        favicon: 'src/assets/favicon.png',
        title: "DEV - Lamp"
    })
  ]
};
