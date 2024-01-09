import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {Cee, CeeRelations} from '../models';

export class CeeRepository extends DefaultCrudRepository<
  Cee,
  typeof Cee.prototype.id,
  CeeRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(Cee, dataSource);
  }

  async getByMediaWithMetadata(limit: number) {
    const query = `
      select c.id, c.title, c.description, c.manifest, c.type, cm.resource, cm.collection, cm.metadata
      from cee as c
      join ceemediacee as cmc on cmc.ceeid = c.id
      join ceemedia as cm on cm.id = cmc.ceemediaid
      where cm.metadata is not null
      order by c.createdat
      limit ${limit}
    `;
    const result = await this.dataSource.execute(query);
    return result;
  }
}
