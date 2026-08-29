import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createBrowseEntityListPayload } from '#modules/browse/helpers'
import { HTTPException } from 'hono/http-exception'
import type { IUseCase } from '#common/types'
import type { BrowseEntityModel } from '#modules/browse/models'
import type { z } from 'zod'

export interface GetTrendingArgs {
  limit: number
}

export class GetTrendingUseCase implements IUseCase<GetTrendingArgs, z.infer<typeof BrowseEntityModel>[]> {
  async execute({ limit }: GetTrendingArgs) {
    const { data, ok } = await useFetch<unknown>({ endpoint: Endpoints.trending, params: {} })

    if (!data || !ok) throw new HTTPException(404, { message: 'could not fetch trending' })

    return createBrowseEntityListPayload(data).slice(0, limit)
  }
}
