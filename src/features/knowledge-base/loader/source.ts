import { KnowledgeLoadError } from './errors'

export interface KnowledgeSource {
  readJson(path: string): Promise<unknown>
}

export function createFetchSource(baseUrl: string): KnowledgeSource {
  const withTrailingSlash = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedBase = /^[a-z]+:\/\//i.test(withTrailingSlash)
    ? withTrailingSlash
    : new URL(withTrailingSlash, window.location.origin).toString()

  return {
    async readJson(path: string): Promise<unknown> {
      const url = new URL(path, normalizedBase).toString()
      let response: Response
      try {
        response = await fetch(url)
      } catch (cause) {
        throw new KnowledgeLoadError(path, cause)
      }
      if (!response.ok) {
        throw new KnowledgeLoadError(path, `HTTP ${response.status}`)
      }
      try {
        return await response.json()
      } catch (cause) {
        throw new KnowledgeLoadError(path, cause)
      }
    },
  }
}

export function createInMemorySource(files: Record<string, unknown>): KnowledgeSource {
  return {
    async readJson(path: string): Promise<unknown> {
      if (!(path in files)) {
        throw new KnowledgeLoadError(path, 'not found in in-memory source')
      }
      return files[path]
    },
  }
}
