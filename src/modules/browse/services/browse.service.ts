import { GetBrowseModulesUseCase, GetTrendingUseCase } from '#modules/browse/use-cases'

export class BrowseService {
  private getTrendingUseCase: GetTrendingUseCase = new GetTrendingUseCase()
  private getBrowseModulesUseCase: GetBrowseModulesUseCase = new GetBrowseModulesUseCase()

  getTrending = (limit: number) => this.getTrendingUseCase.execute({ limit })

  getModules = (limit: number) => this.getBrowseModulesUseCase.execute({ limit })
}
