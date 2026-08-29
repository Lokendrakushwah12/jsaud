import { createImageLinks } from '#common/helpers'
import type { BrowseEntityAPIResponseModel, BrowseEntityModel } from '#modules/browse/models'
import type { z } from 'zod'

export const createBrowseEntityPayload = (
  entity: z.infer<typeof BrowseEntityAPIResponseModel>
): z.infer<typeof BrowseEntityModel> => ({
  id: entity.id,
  name: entity.title,
  subtitle: entity.subtitle || null,
  type: entity.type,
  url: entity.perma_url || null,
  language: entity.language || null,
  explicitContent: entity.explicit_content === '1',
  image: createImageLinks(entity.image || '')
})

/** Upstream lists occasionally carry nulls and entries with no id; drop them. */
export const createBrowseEntityListPayload = (list: unknown): z.infer<typeof BrowseEntityModel>[] =>
  Array.isArray(list)
    ? list
        .filter((entity) => entity && typeof entity === 'object' && entity.id && entity.title)
        .map(createBrowseEntityPayload)
    : []
