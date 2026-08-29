import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createBrowseEntityListPayload } from '#modules/browse/helpers'
import { HTTPException } from 'hono/http-exception'
import type { IUseCase } from '#common/types'
import type { BrowseModulesModel } from '#modules/browse/models'
import type { z } from 'zod'

interface BrowseModulesAPIResponse {
  new_trending?: unknown
  new_albums?: unknown
  charts?: unknown
  top_playlists?: unknown
}

export interface GetBrowseModulesArgs {
  limit: number
}

export class GetBrowseModulesUseCase implements IUseCase<GetBrowseModulesArgs, z.infer<typeof BrowseModulesModel>> {
  async execute({ limit }: GetBrowseModulesArgs) {
    const { data, ok } = await useFetch<BrowseModulesAPIResponse>({ endpoint: Endpoints.modules, params: {} })

    if (!data || !ok) throw new HTTPException(404, { message: 'could not fetch browse modules' })

    const take = (list: unknown) => createBrowseEntityListPayload(list).slice(0, limit)

    return {
      trending: take(data.new_trending),
      newAlbums: take(data.new_albums),
      charts: take(data.charts),
      topPlaylists: take(data.top_playlists)
    }
  }
}
