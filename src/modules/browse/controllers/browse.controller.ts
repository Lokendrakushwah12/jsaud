import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { BrowseEntityModel, BrowseModulesModel } from '#modules/browse/models'
import { BrowseService } from '#modules/browse/services'
import type { Routes } from '#common/types'

const limitQuery = z.object({
  limit: z.coerce.number().int().positive().max(50).optional().default(20).openapi({
    title: 'Limit',
    description: 'Maximum number of entries to return per list',
    type: 'integer',
    example: 20,
    default: 20
  })
})

export class BrowseController implements Routes {
  public controller: OpenAPIHono
  private browseService: BrowseService

  constructor() {
    this.controller = new OpenAPIHono()
    this.browseService = new BrowseService()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/trending',
        tags: ['Browse'],
        summary: 'Retrieve what is trending right now',
        description:
          'Returns the mixed trending feed from JioSaavn — songs, albums and playlists. Use the `type` field to decide which detail endpoint to call for a given entry.',
        operationId: 'getTrending',
        request: { query: limitQuery },
        responses: {
          200: {
            description: 'Successful response with the trending feed',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean().openapi({ description: 'Indicates the success status of the request.' }),
                  data: z.array(BrowseEntityModel).openapi({ title: 'Trending entries' })
                })
              }
            }
          },
          404: { description: 'The trending feed could not be fetched.' }
        }
      }),
      async (ctx) => {
        const { limit } = ctx.req.valid('query')

        return ctx.json({ success: true, data: await this.browseService.getTrending(limit) })
      }
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/modules',
        tags: ['Browse'],
        summary: 'Retrieve the home page browse modules',
        description:
          'Returns the sections JioSaavn shows on its home page: trending, new releases, charts and top playlists.',
        operationId: 'getBrowseModules',
        request: { query: limitQuery },
        responses: {
          200: {
            description: 'Successful response with the browse modules',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean().openapi({ description: 'Indicates the success status of the request.' }),
                  data: BrowseModulesModel.openapi({ title: 'Browse modules' })
                })
              }
            }
          },
          404: { description: 'The browse modules could not be fetched.' }
        }
      }),
      async (ctx) => {
        const { limit } = ctx.req.valid('query')

        return ctx.json({ success: true, data: await this.browseService.getModules(limit) })
      }
    )
  }
}
