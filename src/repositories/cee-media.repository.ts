import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {CeeMedia, CeeMediaRelations} from '../models';

export class CeeMediaRepository extends DefaultCrudRepository<
  CeeMedia,
  typeof CeeMedia.prototype.id,
  CeeMediaRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(CeeMedia, dataSource);
  }
}
