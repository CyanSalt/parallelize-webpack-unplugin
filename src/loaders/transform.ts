import type { UnpluginContext, UnpluginMessage, UnpluginOptions } from 'unplugin'
import type { LoaderDefinition } from 'webpack'
import { createRawPlugins } from '../utils'

interface TransformLoaderOptions {
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

async function transform(
  context: UnpluginContext,
  plugins: UnpluginOptions[],
  code: string,
  map: any,
  id: string,
) {
  for (const hooks of plugins) {
    if (hooks.transform) {
      const result = await hooks.transform.call(context, code, id)
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

const loader: LoaderDefinition<TransformLoaderOptions> = function (source, map, meta) {
  const callback = this.async()
  const { plugin, options } = this.query as TransformLoaderOptions
  const raw = createRawPlugins(plugin, options)
  const context: UnpluginContext = {
    error: error => {
      this.emitError(buildError(error))
    },
    warn: error => {
      this.emitWarning(buildError(error))
    },
  }
  const id = this.resource
  transform(context, raw, source, map, id)
    .then(result => {
      callback(null, result.code, result.map, meta)
    }, err => {
      callback(err)
    })
}

export default loader
