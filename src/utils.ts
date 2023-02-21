import type { UnpluginFactory } from 'unplugin'
import type { Compiler } from 'webpack'

export interface WebpackContextMeta {
  framework: 'webpack',
  webpack: {
    compiler: Compiler,
  },
}

function loadFactory<T>(mod: any): UnpluginFactory<T> {
  if (!mod) return mod
  if (typeof mod === 'string') return loadFactory(require(mod))
  if (mod.default) return loadFactory(mod.default as object)
  return mod.raw || mod
}

export function createRawPlugins<T>(id: string, options: T, metadata?: Partial<WebpackContextMeta>) {
  const factory = loadFactory<T>(id)
  const rawPlugins = factory(options, { framework: 'webpack', ...metadata })
  return Array.isArray(rawPlugins) ? rawPlugins : [rawPlugins]
}
