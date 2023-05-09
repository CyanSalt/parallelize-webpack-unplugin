# parallelize-webpack-unplugin

[![npm](https://img.shields.io/npm/v/parallelize-webpack-unplugin.svg)](https://www.npmjs.com/package/parallelize-webpack-unplugin)

Use [unplugin](https://github.com/unjs/unplugin/) with [thread-loader](https://github.com/webpack-contrib/thread-loader/) in [webpack](https://webpack.js.org/).

## Why You Need It

Many unplugin-based plugins will prompt you that they do not support use with `thread-loaders` (sometimes reflected in the `parallel` configuration of the Vue CLI). For example:

- [`unplugin-vue2-script-setup`](https://github.com/antfu/unplugin-vue2-script-setup/issues/49#issuecomment-957304450)
- [`unplugin-vue-macros`](https://github.com/sxzz/unplugin-vue-macros/issues/23#issuecomment-1170283222), also known as `@vue-macros/reactivity-transform`

`thread-loader` [explains this](https://github.com/webpack-contrib/thread-loader/#getting-started). Since the loaders need to be executed within the worker process, it is not possible to access the compiler instance as with the loader which unplugin is injecting.

This module supports the conversion of unplugin-based plugins that satisfy the constraints into a form that supports `thread-loader`. Specifically:

- The plugin is instantiated without side effects, i.e. the return value of the function passed to `createUnplugin` avoids the use of closure variables
- The plugin does not rely on metadata in the context during instantiation, rather `meta.webpack.compiler`
- `loadInclude` and `transformInclude` only determine the module `id`, ignoring `resourceQuery`
- `loadInclude` and `transformInclude` cannot include external modules

Most plugins satisfy the above conditions and can therefore be transformed.

## Usage

```shell
npm i -D parallelize-webpack-unplugin
```

This module exports a `parallelize` method for converting unplugin-based plugins:

```js
const { parallelize } = require('parallelize-webpack-unplugin')

// To get a new unplugin plugin
parallelize('/path/to/my-unplugin-plugin')
```

You can just

```diff
// webpack.config.js
- const { default: MyUnpluginPlugin } = require('/path/to/my-unplugin-plugin/webpack')

module.exports = {
  plugins: [
-     MyUnpluginPlugin(options),
+     parallelize('/path/to/my-unplugin-plugin')(options),
  ],
}
```
