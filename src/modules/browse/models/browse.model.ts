import { DownloadLinkModel } from '#common/models'
import { z } from 'zod'

/**
 * Trending and browse feeds mix songs, albums, playlists and channels in one list.
 * Rather than model every full payload, normalise them to the fields a home feed
 * actually renders — the type field tells a client which detail endpoint to call next.
 */
export const BrowseEntityAPIResponseModel = z
  .object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    type: z.string(),
    perma_url: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    explicit_content: z.string().nullable().optional()
  })
  .passthrough()

export const BrowseEntityModel = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string().nullable(),
  type: z.string(),
  url: z.string().nullable(),
  language: z.string().nullable(),
  explicitContent: z.boolean(),
  image: z.array(DownloadLinkModel)
})

export const BrowseModulesModel = z.object({
  trending: z.array(BrowseEntityModel),
  newAlbums: z.array(BrowseEntityModel),
  charts: z.array(BrowseEntityModel),
  topPlaylists: z.array(BrowseEntityModel)
})
