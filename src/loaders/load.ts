import type { UnpluginContext, UnpluginOptions } from 'unplugin'
import type { LoaderDefinition } from 'webpack'
import { createRawPlugins } from '../utils'

interface LoadLoaderOptions {
  UNPLUGIN_VIRTUAL_MODULE_PREFIX: string,
  plugin: string,
  options: any,
}

function buildError(error: string | Error) {
  return typeof error === 'string' ? new Error(error) : error
}

async function load(
  context: UnpluginContext,
  plugins: UnpluginOptions[],
  code: string,
  map: any,
  id: string,
) {
  for (const hooks of plugins) {
    if (hooks.load) {
      const result = await hooks.load.call(context, id)
      if (result) {
        code = result.code
        if (result.map) {
          map = result.map
        }
      }
    }
  }
  return { code, map }
}

module.exports = function loader(source, map, meta) {
  const callback = this.async()
  const { UNPLUGIN_VIRTUAL_MODULE_PREFIX, plugin, options } = this.query as LoadLoaderOptions
  const raw = createRawPlugins(plugin, options)
  const context: UnpluginContext = {
    error: error => {
      this.emitError(buildError(error))
    },
    warn: error => {
      this.emitWarning(buildError(error))
    },
  }
  let id = this.resource
  if (id.startsWith(UNPLUGIN_VIRTUAL_MODULE_PREFIX)) {
    id = decodeURIComponent(id.slice(UNPLUGIN_VIRTUAL_MODULE_PREFIX.length))
  }
  load(context, raw, source, map, this.resource)
    .then(result => {
      callback(null, result.code, result.map, meta)
    }, err => {
      callback(err)
    })
} satisfies LoaderDefinition<LoadLoaderOptions>
