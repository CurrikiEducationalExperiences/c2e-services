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

    let queryLicensedMediaIds = ``;
    if (licensedMediaIds.length > 0) {
      queryLicensedMediaIds += `AND (hd.id NOT IN (${licensedMediaIdsStr}))`;
    }

    let queryExcludedListingIds = ``;
    if (this.listingIdsToExclude().length > 0) {
      queryExcludedListingIds += `AND (ceelisting.id NOT IN ('${this.listingIdsToExclude().join("','")}'))`;
    }


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
      WHERE (hd.level = 1 OR cee.type = 'master' ${queryExcludedListingIds})
      ${queryLicensedMediaIds}
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

  listingIdsToExclude(): Array<string> {
    return [
      "9b0b60b0-62b9-11ee-a024-07b4071482ce",
      "9dfa5a30-6280-11ee-a024-07b4071482ce",
      "e2709d10-71e3-11ee-bd32-6134433c312a",
      "1db02390-6281-11ee-a024-07b4071482ce",
      "1c525300-6c1e-11ee-bd32-6134433c312a",
      "0318e570-6836-11ee-bd32-6134433c312a",
      "0e1899c0-6836-11ee-bd32-6134433c312a",
      "1e994d30-6836-11ee-bd32-6134433c312a",
      "2dc8a170-6836-11ee-bd32-6134433c312a",
      "011da230-67a8-11ee-bd32-6134433c312a",
      "3788f300-67a9-11ee-bd32-6134433c312a",
      "850cda10-67a9-11ee-bd32-6134433c312a",
      "dd1be380-628c-11ee-a024-07b4071482ce",
      "8ed52900-6289-11ee-a024-07b4071482ce",
      "71645100-628b-11ee-a024-07b4071482ce",
      "bbdf3dd0-628b-11ee-a024-07b4071482ce",
      "8e28dfc0-6152-11ee-a024-07b4071482ce",
      "c1a7c410-5de7-11ee-a917-39dd9c573fbe",
      "c5781080-5de8-11ee-a917-39dd9c573fbe",
      "523ff2d0-5e3e-11ee-af0c-cf999a695297",
      "8ddfb890-6783-11ee-b2fe-d74fc1d80a28",
      "2e10d370-6785-11ee-b2fe-d74fc1d80a28",
      "4c4bad60-5e1b-11ee-9d8d-3dd56f151986",
      "a5ef5ec0-5e1b-11ee-9d8d-3dd56f151986",
      "f321fc10-5e1c-11ee-9d8d-3dd56f151986",
      "340ca310-5e1d-11ee-9d8d-3dd56f151986",
      "54813340-5e1d-11ee-9d8d-3dd56f151986",
      "d42c79e0-5e60-11ee-af0c-cf999a695297",
      "a9b845a0-6837-11ee-bd32-6134433c312a",
      "8f6f2fc0-5e4f-11ee-af0c-cf999a695297",
      "c5eb6b20-5e3d-11ee-9d8d-3dd56f151986",
      "5fa6c4a0-5e55-11ee-af0c-cf999a695297",
      "5150e070-5e55-11ee-af0c-cf999a695297",
      "7fcc5fd0-677c-11ee-b2fe-d74fc1d80a28",
      "5277fb70-6902-11ee-bd32-6134433c312a",
      "7e96e700-7999-11ee-b589-c74808d70e9f",
    ]
  }
}
