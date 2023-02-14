import * as path from 'path'
import type { UnpluginFactoryOutput, UnpluginOptions } from 'unplugin'
import { createUnplugin } from 'unplugin'
import type { Compiler, WebpackPluginInstance } from 'webpack'
import { createRawPlugins } from './utils'

const UNPLUGIN_VIRTUAL_MODULE_PREFIX = path.resolve(process.cwd(), '_virtual_')

function createPluginFactory<T>(plugin: string) {
  let raw: UnpluginOptions[] = []
  const { webpack: webpackPluginFactory } = createUnplugin<T>(options => {
    raw = createRawPlugins(plugin, options)
    return raw.map(({ load, transform, ...hooks }) => hooks)
  })
  return (options: T) => ({
    instance: webpackPluginFactory(options),
    rawGetter: () => raw,
  })
}

export function parallelize<T>(plugin: string): UnpluginFactoryOutput<T, WebpackPluginInstance> {
  const factory = createPluginFactory<T>(plugin)
  return (options: T) => ({
    apply(compiler: Compiler) {
      const { instance, rawGetter } = factory(options)
      instance.apply(compiler)
      for (const hooks of rawGetter()) {
        if (hooks.transform) {
          compiler.options.module.rules.push({
            include(id) {
              return !(
                hooks.transformInclude && !hooks.transformInclude(id)
              )
            },
            enforce: hooks.enforce,
            use: [
              {
                loader: require.resolve('./loaders/transform'),
                options: {
                  plugin,
                  options,
                },
              },
            ],
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
                loader: require.resolve('./loaders/load'),
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
