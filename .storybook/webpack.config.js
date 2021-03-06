const path = require('path');
const DocgenPlugin = require('./docgen-plugin');
const createCompiler = require('@storybook/addon-docs/mdx-compiler-plugin');

const modulesPath = path.resolve(__dirname, '../modules');
const welcomeSectionPath = path.resolve(__dirname, './');
const utilsPath = path.resolve(__dirname, '../utils');
const postcssConfigPath = path.resolve(__dirname, './postcss.config');

module.exports = ({ config, mode }) => {
  // This is so we get consistent results when loading .ts/tsx and .mdx files
  const babelPresetEnvConfig = [
    '@babel/preset-env',
    {
      'useBuiltIns': 'entry',
      'corejs': {
        version: 3,
        proposals: true
      }
    }
  ];

  // Exclude all node_modules from babel-loader
  config.module.rules
    .find(rule => /mjs\|jsx/.test(rule.test.toString()))
    .exclude.push(/node_modules/);

  // Filter out extraneous rules added by CRA (react-scripts)
  // react-scripts automatically adds js/ts matchers for a `src` folder which we don't use so these rules are moot
  config.module.rules = config.module.rules.filter(
    rule => !/js\|mjs\|jsx\|ts\|tsx/.test(rule.test.toString())
  );

  // Override CRA postcss presets
  config.module.rules.forEach(rule => {
    if (rule.test.toString().includes('scss|sass')) {
      delete rule.use[2].options.plugins;

      rule.use[2].options.config = {
        path: postcssConfigPath,
      };
    }
  });

  // Add `.ts` and `.tsx` as a resolvable extension.
  config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx'];

  // Load all module files and transpile using babel + ts
  config.module.rules.push({
    test: /\.(ts|tsx)$/,
    include: [modulesPath, utilsPath],
    loader: require.resolve('babel-loader'),
    options: {
      presets: [
        '@babel/preset-typescript',
        '@babel/preset-react',
        babelPresetEnvConfig,
      ],
      plugins: [
        '@babel/proposal-class-properties',
        '@babel/proposal-object-rest-spread',
        '@babel/plugin-transform-modules-commonjs',
        [
          'emotion',
          {
            autoLabel: true,
            labelFormat: '[filename]__[local]',
          },
        ],
      ],
    },
  });

  config.module.rules.push({
    test: /\.mdx$/,
    include: [modulesPath, welcomeSectionPath],
    exclude: [/node_modules/],
    use: [
      {
        loader: 'babel-loader',
        options: {
          presets: [babelPresetEnvConfig],
          plugins: ['@babel/plugin-transform-react-jsx']
        },
      },
      {
        loader: '@mdx-js/loader',
        options: { compilers: [createCompiler()] },
      },
    ],
  });

  // Load the source code of story files to display in docs.
  config.module.rules.push({
    test: /stories.*\.tsx?$/,
    include: [modulesPath],
    loaders: [
      {
        loader: require.resolve('@storybook/source-loader'),
        options: { parser: 'typescript' },
      },
    ],
    enforce: 'pre',
  });

  config.plugins.push(new DocgenPlugin());

  return config;
};
