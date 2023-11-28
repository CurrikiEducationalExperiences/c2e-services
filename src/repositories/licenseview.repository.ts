import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {Licenseview, LicenseviewRelations} from '../models';

export class LicenseviewRepository extends DefaultCrudRepository<
  Licenseview,
  typeof Licenseview.prototype.id,
  LicenseviewRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(Licenseview, dataSource);
  }
}
