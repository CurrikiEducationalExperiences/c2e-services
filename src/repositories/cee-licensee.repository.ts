import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {CeeLicensee, CeeLicenseeRelations} from '../models';

export class CeeLicenseeRepository extends DefaultCrudRepository<
  CeeLicensee,
  typeof CeeLicensee.prototype.id,
  CeeLicenseeRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(CeeLicensee, dataSource);
  }
}
