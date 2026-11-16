import type { UnpluginContext, UnpluginMessage, UnpluginOptions } from 'unplugin'
import type { LoaderDefinition } from 'webpack'
import { createRawPlugins } from '../utils'

interface LoadLoaderOptions {
  UNPLUGIN_VIRTUAL_MODULE_PREFIX: string,
  plugin: string,
  options: any,
}

function buildError(error: string | Error | UnpluginMessage) {
  if (typeof error === 'string') {
    return new Error(error)
  }
  return error instanceof Error
    ? error
    : new Error('message' in error ? error.message : String(error))
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
        if (typeof result === 'string') {
          code = result
        } else {
          code = result.code
          if (result.map) {
            map = result.map
          }
        }
      }
    }
  }
  return { code, map }
}

const loader: LoaderDefinition<LoadLoaderOptions> = function (source, map, meta) {
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
  load(context, raw, source, map, id)
    .then(result => {
      callback(null, result.code, result.map, meta)
    }, err => {
      callback(err)
    })
}

export default loader
