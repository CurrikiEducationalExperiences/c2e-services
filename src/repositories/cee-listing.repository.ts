import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {CeeListing, CeeListingRelations} from '../models';

export class CeeListingRepository extends DefaultCrudRepository<
  CeeListing,
  typeof CeeListing.prototype.id,
  CeeListingRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(CeeListing, dataSource);
  }
}
