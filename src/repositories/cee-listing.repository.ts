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

  async listByLicensedMedia(email: string) {
    const result = await this.dataSource.execute(`
    WITH RECURSIVE HierarchicalData AS (
        SELECT id, title, parentid, identifier, identifierType, 1 as level, id::text AS path
        FROM ceemedia
        WHERE parentid IS NULL

        UNION ALL

        SELECT t.id, t.title, t.parentid, t.identifier, t.identifierType, h.level + 1, h.path || '/' || LPAD(t.id::text, 10, '0')
        FROM ceemedia t
        INNER JOIN HierarchicalData h ON t.parentid = h.id
    )
    SELECT hd.id, hd.title, hd.parentid, hd.identifier, hd.identifierType, hd.level,
    cee.id as cee_id,
    cee.type as cee_type,
    cee.title as cee_title,
    ceelisting.id as ceelisting_id,
    cee_licensed.id as cee_id_licensed,
    cee_licensed.type as cee_type_licensed,
    ceelicensee.email as cee_licensee_email
    FROM HierarchicalData as hd
    LEFT JOIN ceemediacee as md_cee ON md_cee.ceemediaid = hd.id
    LEFT JOIN cee ON cee.id = md_cee.ceeid
    LEFT JOIN ceelisting ON ceelisting.ceemasterid = cee.id
    LEFT JOIN ceelicense ON ceelicense.ceelistingid = ceelisting.id
    LEFT JOIN cee as cee_licensed ON cee_licensed.id = ceelicense.ceeid
    LEFT JOIN ceelicensee ON ceelicensee.id = ceelicense.licenseeid
    WHERE hd.level = 1 OR (cee_licensed.type = 'licensed' AND ceelicensee.email = '${email}')
    ORDER BY path, (SELECT createdat FROM ceemedia WHERE id = hd.id);
    `);

    // filter out level 1 media that does not have children with respect to parentid
    const filtered = result.filter((item: any) => {
      if (item.level === 1) {
        const children = result.filter((child: any) => {
          return child.parentid === item.id;
        });
        return children.length > 0;
      }
      return true;
    });

    return filtered;
  }

  async listByMediaToLicense(email: string) {
    const licensedMedia = await this.listByLicensedMedia(email);
    // filter media that are part of the Book
    const licensedMediaCees = licensedMedia.filter((item: any) => {
      return item.level !== 1;
    });

    const licensedMediaIds = licensedMediaCees.map((item: any) => {
      return item.id;
    });

    const licensedMediaIdsStr = licensedMediaIds.map((id: string) => {
      return "'" + id + "'";
    }).join(',');


    /*
    const listing_ids: Array<string> = [
      'dae62080-5b75-11ee-a229-4180943df2b8',
      'd306a280-5b76-11ee-88ff-a5179564b636',
      'd07ba650-5b80-11ee-9691-4fe6024056e9',
      '81732bf0-5c4d-11ee-9a64-3b87cb72caae',
      '33372b80-5ab8-11ee-ad4f-43ff23d02c5e',
      '7a4993f0-5aef-11ee-9d8f-f3d1287dbf3b'
    ];

    const listing_ids_str = listing_ids.map(id => "'" + id + "'").join(',');
    */

    const query = `
      WITH RECURSIVE HierarchicalData AS (
          SELECT id, title, parentid, identifier, identifierType, 1 as level, id::text AS path
          FROM ceemedia
          WHERE parentid IS NULL

          UNION ALL

          SELECT t.id, t.title, t.parentid, t.identifier, t.identifierType, h.level + 1, h.path || '/' || LPAD(t.id::text, 10, '0')
          FROM ceemedia t
          INNER JOIN HierarchicalData h ON t.parentid = h.id
      )
      SELECT hd.id, hd.title, hd.parentid, hd.identifier, hd.identifierType, hd.level,
      cee.id as cee_id,
      cee.type as cee_type,
      cee.title as cee_title,
      ceelisting.id as ceelisting_id
      FROM HierarchicalData as hd
      LEFT JOIN ceemediacee as md_cee ON md_cee.ceemediaid = hd.id
      LEFT JOIN cee ON cee.id = md_cee.ceeid
      LEFT JOIN ceelisting ON ceelisting.ceemasterid = cee.id
      WHERE (hd.level = 1 OR cee.type = 'master')
      AND (hd.id NOT IN (${licensedMediaIdsStr}))
      ORDER BY path, (SELECT createdat FROM ceemedia WHERE id = hd.id)
    `;

    const result = await this.dataSource.execute(query);

    // filter out level 1 media that does not have children with respect to parentid
    const filtered = result.filter((item: any) => {
      if (item.level === 1) {
        const children = result.filter((child: any) => {
          return child.parentid === item.id;
        });
        return children.length > 0;
      }
      return true;
    });

    return filtered;
  }
}
