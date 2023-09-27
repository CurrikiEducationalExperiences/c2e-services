import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {CeeWriter, CeeWriterRelations} from '../models';

export class CeeWriterRepository extends DefaultCrudRepository<
  CeeWriter,
  typeof CeeWriter.prototype.id,
  CeeWriterRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(CeeWriter, dataSource);
  }
}
