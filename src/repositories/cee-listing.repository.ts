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

  async listByLicensedMedia() {
    const result = await this.dataSource.execute(`
      SELECT
        md.id as media_id,
        md.title as media_title,
        md.identifier as isbn,
        md.resource as media_resource,
        cee.id as cee_id,
        cee.type as cee_type,
        cee.title as cee_title,
        ceelisting.id as ceelisting_id
      FROM ceemedia as md
      LEFT JOIN ceemediacee as md_cee ON md_cee.ceemediaid = md.id
      LEFT JOIN cee ON cee.id = md_cee.ceeId
      LEFT JOIN ceelisting ON ceelisting.ceemasterid = cee.id
      WHERE
        (md.parentid IS NULL AND md_cee.ceeId IS NULL)
        OR (md.parentid IS NOT NULL AND md_cee.ceeId IS NOT NULL)
        AND cee.type = 'licensed'
      ORDER BY md.createdat ASC
    `);
    return result;
  }

  async listByMediaToLicense() {
    const listing_ids: Array<string> = [
      'dae62080-5b75-11ee-a229-4180943df2b8',
      'd306a280-5b76-11ee-88ff-a5179564b636',
      'd07ba650-5b80-11ee-9691-4fe6024056e9',
      '81732bf0-5c4d-11ee-9a64-3b87cb72caae',
      '33372b80-5ab8-11ee-ad4f-43ff23d02c5e',
      '7a4993f0-5aef-11ee-9d8f-f3d1287dbf3b'
    ];

    const listing_ids_str = listing_ids.map(id => "'" + id + "'").join(',');
    /*
    const result = await this.dataSource.execute(`
    SELECT
      md.id as media_id,
      md.title as media_title,
      md.identifier as isbn,
      md.resource as media_resource,
      cee.id as cee_id,
      cee.type as cee_type,
      cee.title as cee_title,
      ceelisting.id as ceelisting_id
    FROM ceemedia as md
    LEFT JOIN ceemediacee as md_cee ON md_cee.ceemediaid = md.id
    LEFT JOIN cee ON cee.id = md_cee.ceeId
    LEFT JOIN ceelisting ON ceelisting.ceemasterid = cee.id
    WHERE
      (md.parentid IS NULL AND md_cee.ceeId IS NULL)
      OR (md.parentid IS NOT NULL AND md_cee.ceeId IS NOT NULL)
      AND cee.type = 'master'
      AND ceelisting.id IN (
        ` + listing_ids_str + `
      )
    ORDER BY md.createdat ASC

    `);
    */
    const result = await this.dataSource.execute(`
      SELECT
        md.id as media_id,
        md.title as media_title,
        md.identifier as isbn,
        md.resource as media_resource,
        cee.id as cee_id,
        cee.type as cee_type,
        cee.title as cee_title,
        ceelisting.id as ceelisting_id
      FROM ceemedia as md
      LEFT JOIN ceemediacee as md_cee ON md_cee.ceemediaid = md.id
      LEFT JOIN cee ON cee.id = md_cee.ceeId
      LEFT JOIN ceelisting ON ceelisting.ceemasterid = cee.id
      WHERE
        (md.parentid IS NULL AND md_cee.ceeId IS NULL)
        OR (md.parentid IS NOT NULL AND md_cee.ceeId IS NOT NULL)
        AND cee.type = 'master'
      ORDER BY md.createdat ASC
    `);
    return result;
  }
}
