import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {CeeLicense, CeeLicenseRelations} from '../models';

export class CeeLicenseRepository extends DefaultCrudRepository<
  CeeLicense,
  typeof CeeLicense.prototype.id,
  CeeLicenseRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(CeeLicense, dataSource);
  }
}
