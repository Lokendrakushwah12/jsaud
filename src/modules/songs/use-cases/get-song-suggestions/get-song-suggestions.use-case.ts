import { Endpoints } from '#common/constants'
import { ApiContextEnum } from '#common/enums'
import { useFetch } from '#common/helpers'
import { createSongPayload } from '#modules/songs/helpers'
import { CreateSongStationUseCase } from '#modules/songs/use-cases'
import { HTTPException } from 'hono/http-exception'
import type { IUseCase } from '#common/types'
import type { SongModel, SongSuggestionAPIResponseModel } from '#modules/songs/models'
import type { z } from 'zod'

export interface GetSongSuggestionsArgs {
  songId: string
  limit: number
}

export class GetSongSuggestionsUseCase implements IUseCase<GetSongSuggestionsArgs, z.infer<typeof SongModel>[]> {
  private readonly createSongStation: CreateSongStationUseCase

  constructor() {
    this.createSongStation = new CreateSongStationUseCase()
  }

  async execute({ songId, limit }: GetSongSuggestionsArgs) {
    const stationId = await this.createSongStation.execute(songId)

    const { data, ok } = await useFetch<z.infer<typeof SongSuggestionAPIResponseModel>>({
      endpoint: Endpoints.songs.suggestions,
      params: {
        stationid: stationId,
        k: limit
      },
      context: ApiContextEnum.ANDROID
    })

    if (!data || !ok) {
      throw new HTTPException(404, { message: `no suggestions found for the given song` })
    }

    const { stationid, ...suggestions } = data

    // A station with nothing left answers `{ stationid, error: 'No new' }`, and any
    // future non-song key would land here too — so keep only entries carrying a song
    // rather than mapping first and filtering the wreckage afterwards.
    return Object.values(suggestions)
      .filter((element) => element && typeof element === 'object' && 'song' in element && element.song)
      .map((element) => createSongPayload(element.song))
      .slice(0, limit)
  }
}
