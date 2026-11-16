import { createRequire } from 'module'
import * as path from 'path'
import type { UnpluginFactoryOutput, UnpluginOptions } from 'unplugin'
import { createUnplugin } from 'unplugin'
import type { Compiler, WebpackPluginInstance } from 'webpack'
import { createRawPlugins } from './utils'

const UNPLUGIN_VIRTUAL_MODULE_PREFIX = path.resolve(process.cwd(), '_virtual_')

function normalizeAbsolutePath(file: string) {
  return path.isAbsolute(file) ? path.normalize(file) : file
}

export function parallelize<T>(plugin: string): UnpluginFactoryOutput<T, WebpackPluginInstance> {
  return (options: T) => ({
    apply(compiler: Compiler) {
      let rawPlugins: UnpluginOptions[] = []
      const { webpack: webpackPluginFactory } = createUnplugin<T>(opts => {
        rawPlugins = createRawPlugins(plugin, opts, { webpack: { compiler } })
        return rawPlugins.map(({ load, transform, ...hooks }) => hooks)
      })
      const instance = webpackPluginFactory(options)
      instance.apply(compiler)
      const require = createRequire(import.meta.url)
      for (const hooks of rawPlugins) {
        if (hooks.transform) {
          compiler.options.module.rules.push({
            enforce: hooks.enforce,
            use(data) {
              if (typeof data.resource !== 'string') return []
              const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ''))
              if (hooks.transformInclude && !hooks.transformInclude(id)) return []
              return [{
                loader: require.resolve('./loaders/transform.cjs'),
                options: {
                  plugin,
                  options,
                },
              }]
            },
          })
        }
        if (hooks.load) {
          compiler.options.module.rules.unshift({
            include(id) {
              if (id.startsWith(UNPLUGIN_VIRTUAL_MODULE_PREFIX)) {
                id = decodeURIComponent(id.slice(UNPLUGIN_VIRTUAL_MODULE_PREFIX.length))
              }
              // External modules should be excluded manually
              return !(
                hooks.loadInclude && !hooks.loadInclude(id)
              )
            },
            enforce: hooks.enforce,
            use: [
              {
                loader: require.resolve('./loaders/load.cjs'),
                options: {
                  UNPLUGIN_VIRTUAL_MODULE_PREFIX,
                  plugin,
                  options,
                },
              },
            ],
          })
        }
      }
    },
  })
}
