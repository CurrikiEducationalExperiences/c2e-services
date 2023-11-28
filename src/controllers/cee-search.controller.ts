import {repository} from '@loopback/repository';
import {get, param} from '@loopback/rest';
import {checkIntegrationToken} from '../cee/utils/gapi';
import {CeeLicenseeRepository, LicenseviewRepository} from '../repositories';

export class LicenseController {
  constructor(
    @repository(LicenseviewRepository)
    public LicenseviewRepository: LicenseviewRepository,
    @repository(CeeLicenseeRepository)
    public CeeLicenseeRepository: CeeLicenseeRepository,
  ) {}

  @get('/licenses')
  async find(
    @param.query.number('page') page: number = 1,
    @param.query.number('limit') limit: number = 10,
    @param.query.string('query') query: string = '',
    @param.query.string('email') email: string = '',
    @param.query.string('secret') secret: string = '',
  ) {
    const authCheck = await checkIntegrationToken(this.CeeLicenseeRepository, email, secret);

    if (!authCheck)
      throw new Error('Authentication failed');

    const licenses = await this.LicenseviewRepository.find({
      skip: (page - 1) * limit,
      limit: limit,
      where: {title: {ilike: `%${query}%`}}
    });
    const results = licenses.map((row) => {
      return {
        ...row,
        breadcrumb: JSON.parse(row.breadcrumb),
        author: JSON.parse(row.author),
        metadata: JSON.parse(row.metadata),
      }
    });
    const count = await this.LicenseviewRepository.count();
    return {
      data: results,
      count: count,
      page: page,
      limit: limit,
    };
  }
}
