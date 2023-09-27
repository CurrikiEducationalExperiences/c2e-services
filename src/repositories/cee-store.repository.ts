import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {CeeStore, CeeStoreRelations} from '../models';

export class CeeStoreRepository extends DefaultCrudRepository<
  CeeStore,
  typeof CeeStore.prototype.id,
  CeeStoreRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(CeeStore, dataSource);
  }
}
