import {repository} from '@loopback/repository';
import {post, requestBody} from '@loopback/rest';
import {checkIntegrationToken} from '../cee/utils/gapi';
// import {LRS_ENDPOINT, LRS_PASS, LRS_USER} from '../config';
import {CeeLicenseeRepository} from '../repositories';
const TinCan = require('tincanjs');

export class XapiController {
  constructor(
    @repository(CeeLicenseeRepository)
    public CeeLicenseeRepository: CeeLicenseeRepository
  ) {}

  @post('/xapi')
  async saveXAPI(
    @requestBody() req: any
  ) {
    const authCheck = await checkIntegrationToken(this.CeeLicenseeRepository, req.email, req.secret);
    if (!authCheck)
      throw new Error('Authentication failed');

    const lrs = new TinCan.LRS({
/*
      endpoint: LRS_ENDPOINT,
      username: LRS_USER,
      password: LRS_PASS,
      allowFail: false,
*/
      // Temp
      endpoint: 'https://c2e-trax.curriki.org/trax/ws/xapi',
      username: '9491dfe3-fd45-4bb8-b9d5-3480bcddd780',
      password: '8a290a3a-ff9b-4d5c-a4e9-96550d85b393',
      allowFail: false,
    });
    const statement = new TinCan.Statement(JSON.parse(req.statement));
    await lrs.saveStatement(statement, { callback: (err:  string) => {
      if (err !== null)
        console.log('error', err);
      else
        console.log('saved');
    }});

    return { result: 'ok' };
  }
}
