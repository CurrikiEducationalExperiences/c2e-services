import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {CeeLicenseDownload, CeeLicenseDownloadRelations} from '../models';

export class CeeLicenseDownloadRepository extends DefaultCrudRepository<
  CeeLicenseDownload,
  typeof CeeLicenseDownload.prototype.id,
  CeeLicenseDownloadRelations
> {
  constructor(
    @inject('datasources.postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(CeeLicenseDownload, dataSource);
  }
}
