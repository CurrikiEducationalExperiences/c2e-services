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

    const filteredForDuplicates = filtered.filter((item: any) => {
      let ok = true;


      // check in const 'filtered' dataset that item.title exists more than once.
      const filteredItems = filtered.filter((child: any) => {
        return child.title === item.title && child.id === item.parentid;
      });

      if (filteredItems.length > 1) {
        const filteredItemsData = filteredItems.find((child: any) => {
          return this.listingIdsToInclude().includes(child.ceelisting_id);
        });
        ok = filteredItemsData ? true : false;
      }


      return ok;
    });

    //return filtered;
    return filteredForDuplicates;
  }

  listingIdsToInclude(): Array<string> {
    // adrenaline SKUs / listing ids
    const adrenalineSKUs = [
      "52962a70-6905-11ee-bd32-6134433c312a",
      "5277fb70-6902-11ee-bd32-6134433c312a",
      "4a7114c0-6902-11ee-bd32-6134433c312a",
      "3f064290-6902-11ee-bd32-6134433c312a",
      "34daa720-6902-11ee-bd32-6134433c312a",
      "27745310-6902-11ee-bd32-6134433c312a",
      "efd7dfd0-6901-11ee-bd32-6134433c312a",
      "dac37370-6901-11ee-bd32-6134433c312a",
      "c535df70-6901-11ee-bd32-6134433c312a",
      "a1cc2b20-6901-11ee-bd32-6134433c312a",
      "97f629c0-6901-11ee-bd32-6134433c312a",
      "8e46c330-6901-11ee-bd32-6134433c312a",
      "80ab0740-6901-11ee-bd32-6134433c312a",
      "75728fb0-6901-11ee-bd32-6134433c312a",
      "4e21b620-6901-11ee-bd32-6134433c312a",
      "f0d423f0-686e-11ee-bd32-6134433c312a",
      "781554b0-686a-11ee-bd32-6134433c312a",
      "48d932c0-686a-11ee-bd32-6134433c312a",
      "976f1b80-6869-11ee-bd32-6134433c312a",
      "4a39c9a0-6869-11ee-bd32-6134433c312a",
      "bf4a2490-5e61-11ee-af0c-cf999a695297",
      "af78eb00-5e61-11ee-af0c-cf999a695297",
      "a12e0350-5e61-11ee-af0c-cf999a695297",
      "94ec0b00-5e61-11ee-af0c-cf999a695297",
      "889fd980-5e61-11ee-af0c-cf999a695297",
      "7a3f9510-5e61-11ee-af0c-cf999a695297",
      "6dadf620-5e61-11ee-af0c-cf999a695297",
      "62933fc0-5e61-11ee-af0c-cf999a695297",
      "58566640-5e61-11ee-af0c-cf999a695297",
      "4be71c60-5e61-11ee-af0c-cf999a695297",
      "40f327e0-5e61-11ee-af0c-cf999a695297",
      "2ff52e20-5e61-11ee-af0c-cf999a695297",
      "208c2c40-5e61-11ee-af0c-cf999a695297",
      "ebf1ae60-5e60-11ee-af0c-cf999a695297",
      "e1265080-5e60-11ee-af0c-cf999a695297",
      "d42c79e0-5e60-11ee-af0c-cf999a695297",
      "69c08c20-5e5d-11ee-af0c-cf999a695297",
      "122db960-5e5d-11ee-af0c-cf999a695297",
      "74fd8d00-5e5c-11ee-af0c-cf999a695297",
      "65a2bbf0-5e5c-11ee-af0c-cf999a695297",
      "5776f500-5e5c-11ee-af0c-cf999a695297",
      "4cc2a190-5e5c-11ee-af0c-cf999a695297",
      "417653e0-5e5c-11ee-af0c-cf999a695297",
      "33f65d50-5e5c-11ee-af0c-cf999a695297",
      "2650b650-5e5c-11ee-af0c-cf999a695297",
      "1b8f1c70-5e5c-11ee-af0c-cf999a695297",
      "0e81e4e0-5e5c-11ee-af0c-cf999a695297",
      "00784bf0-5e5c-11ee-af0c-cf999a695297",
      "f6449a30-5e5b-11ee-af0c-cf999a695297",
      "eab290f0-5e5b-11ee-af0c-cf999a695297",
      "de606c00-5e5b-11ee-af0c-cf999a695297",
      "c8d3c260-5e5b-11ee-af0c-cf999a695297",
      "a6f764d0-5e5b-11ee-af0c-cf999a695297",
      "9ac0b720-5e5b-11ee-af0c-cf999a695297",
      "8eaa3ba0-5e5b-11ee-af0c-cf999a695297",
      "82945c60-5e5b-11ee-af0c-cf999a695297",
      "779655c0-5e5b-11ee-af0c-cf999a695297",
      "6c5ca5b0-5e5b-11ee-af0c-cf999a695297",
      "608248d0-5e5b-11ee-af0c-cf999a695297",
      "544afee0-5e5b-11ee-af0c-cf999a695297",
      "43d4f9d0-5e5b-11ee-af0c-cf999a695297",
      "34e9b370-5e5b-11ee-af0c-cf999a695297",
      "ef941890-5e57-11ee-af0c-cf999a695297",
      "6df013c0-5e57-11ee-af0c-cf999a695297",
      "60904f60-5e57-11ee-af0c-cf999a695297",
      "5540a650-5e57-11ee-af0c-cf999a695297",
      "3c148ed0-5e57-11ee-af0c-cf999a695297",
      "2e9e5c40-5e57-11ee-af0c-cf999a695297",
      "2160c5e0-5e57-11ee-af0c-cf999a695297",
      "141748a0-5e57-11ee-af0c-cf999a695297",
      "071de730-5e57-11ee-af0c-cf999a695297",
      "f27bebb0-5e56-11ee-af0c-cf999a695297",
      "d83340a0-5e56-11ee-af0c-cf999a695297",
      "c8d84880-5e56-11ee-af0c-cf999a695297",
      "ba3d9320-5e56-11ee-af0c-cf999a695297",
      "ad989340-5e56-11ee-af0c-cf999a695297",
      "a0605410-5e56-11ee-af0c-cf999a695297",
      "923d18a0-5e56-11ee-af0c-cf999a695297",
      "864aee00-5e56-11ee-af0c-cf999a695297",
      "6f418f70-5e56-11ee-af0c-cf999a695297",
      "5ea6c450-5e56-11ee-af0c-cf999a695297",
      "50e9c4c0-5e56-11ee-af0c-cf999a695297",
      "419de7d0-5e56-11ee-af0c-cf999a695297",
      "31627ac0-5e56-11ee-af0c-cf999a695297",
      "21fb4da0-5e56-11ee-af0c-cf999a695297",
      "1586ac90-5e56-11ee-af0c-cf999a695297",
      "07d768a0-5e56-11ee-af0c-cf999a695297",
      "9bfc13c0-5e4f-11ee-af0c-cf999a695297",
      "81453d90-5e4f-11ee-af0c-cf999a695297",
      "7607e400-5e4f-11ee-af0c-cf999a695297",
      "6a00aac0-5e4f-11ee-af0c-cf999a695297",
      "5eada650-5e4f-11ee-af0c-cf999a695297",
      "5254f1b0-5e4f-11ee-af0c-cf999a695297",
      "439aa660-5e4f-11ee-af0c-cf999a695297",
      "37967a60-5e4f-11ee-af0c-cf999a695297",
      "28fcaf60-5e4f-11ee-af0c-cf999a695297",
      "1d135e60-5e4f-11ee-af0c-cf999a695297",
      "0ed23ab0-5e4f-11ee-af0c-cf999a695297",
      "018f9b40-5e4f-11ee-af0c-cf999a695297",
      "294f8b50-5e44-11ee-af0c-cf999a695297",
      "ab3f9170-5e3d-11ee-9d8d-3dd56f151986",
      "9faff930-5e3d-11ee-9d8d-3dd56f151986",
      "95622fc0-5e3d-11ee-9d8d-3dd56f151986",
      "89686400-5e3d-11ee-9d8d-3dd56f151986",
      "6225e250-5e3d-11ee-9d8d-3dd56f151986",
      "56135e70-5e3d-11ee-9d8d-3dd56f151986",
      "462ffc70-5e3d-11ee-9d8d-3dd56f151986",
      "39ea5aa0-5e3d-11ee-9d8d-3dd56f151986",
      "101a2930-5e3d-11ee-9d8d-3dd56f151986",
      "0486e770-5e3d-11ee-9d8d-3dd56f151986",
      "f421ab40-5e3c-11ee-9d8d-3dd56f151986",
      "84f943b0-5e35-11ee-9d8d-3dd56f151986",
      "77f3ad40-5e35-11ee-9d8d-3dd56f151986",
      "b0de79d0-5e32-11ee-9d8d-3dd56f151986",
      "98125ca0-5e32-11ee-9d8d-3dd56f151986",
      "8693e840-5e32-11ee-9d8d-3dd56f151986",
      "75745cc0-5e32-11ee-9d8d-3dd56f151986",
      "6b08d220-5e32-11ee-9d8d-3dd56f151986",
      "54da1c20-5e32-11ee-9d8d-3dd56f151986",
      "fa26a870-5e31-11ee-9d8d-3dd56f151986",
      "2bd7de80-5e31-11ee-9d8d-3dd56f151986",
      "770d12e0-5dea-11ee-a917-39dd9c573fbe",
      "1bb289c0-5dea-11ee-a917-39dd9c573fbe",
      "78896f20-5de9-11ee-a917-39dd9c573fbe",
      "6696dc30-5de9-11ee-a917-39dd9c573fbe",
      "5377b020-5de9-11ee-a917-39dd9c573fbe",
      "4394ea60-5de9-11ee-a917-39dd9c573fbe",
      "2c865bb0-5de9-11ee-a917-39dd9c573fbe",
      "1c39b090-5de9-11ee-a917-39dd9c573fbe",
      "0a8dc390-5de9-11ee-a917-39dd9c573fbe",
      "97eba690-5d89-11ee-a917-39dd9c573fbe",
      "a5412d60-5d6b-11ee-a917-39dd9c573fbe",
      "421bd900-5d67-11ee-a917-39dd9c573fbe",
      "0ea086c0-5d67-11ee-a917-39dd9c573fbe",
      "31874c40-5d63-11ee-a917-39dd9c573fbe",
      "e3fa1660-5d62-11ee-a917-39dd9c573fbe",
      "b4fcd230-5d62-11ee-a917-39dd9c573fbe",

      "850cda10-67a9-11ee-bd32-6134433c312a",
      "786f7b50-67a9-11ee-bd32-6134433c312a",
      "7003b850-67a9-11ee-bd32-6134433c312a",
      "65252090-67a9-11ee-bd32-6134433c312a",
      "43c43490-67a9-11ee-bd32-6134433c312a",
      "2cacf350-67a9-11ee-bd32-6134433c312a",
      "23289460-67a9-11ee-bd32-6134433c312a",
      "16eabac0-67a9-11ee-bd32-6134433c312a",
      "0c272510-67a9-11ee-bd32-6134433c312a",
      "00a8a3d0-67a9-11ee-bd32-6134433c312a",
      "f6d93220-67a8-11ee-bd32-6134433c312a",
      "ecfc2be0-67a8-11ee-bd32-6134433c312a",
      "d51e3f40-67a8-11ee-bd32-6134433c312a",
      "c97ea170-67a8-11ee-bd32-6134433c312a",
      "c0201a00-67a8-11ee-bd32-6134433c312a",
      "9ad6a930-67a8-11ee-bd32-6134433c312a",
      "8974bd80-67a8-11ee-bd32-6134433c312a",
      "80d51940-67a8-11ee-bd32-6134433c312a",
      "69e5f970-67a8-11ee-bd32-6134433c312a",
      "5fb3ce50-67a8-11ee-bd32-6134433c312a",
      "3ef515c0-67a8-11ee-bd32-6134433c312a",
      "315a1d20-67a8-11ee-bd32-6134433c312a",
      "26fc4e20-67a8-11ee-bd32-6134433c312a",
      "19cb3ae0-67a8-11ee-bd32-6134433c312a",
      "0d8af040-67a8-11ee-bd32-6134433c312a",
      "011da230-67a8-11ee-bd32-6134433c312a",
      "f4a5a5c0-67a7-11ee-bd32-6134433c312a",
      "b7f62ce0-67a6-11ee-bd32-6134433c312a",
      "91fc09b0-67a6-11ee-bd32-6134433c312a",
      "17993620-679c-11ee-bd32-6134433c312a",
      "fa9aaa20-5de8-11ee-a917-39dd9c573fbe",
      "eafe8a50-5de8-11ee-a917-39dd9c573fbe",
      "daee7300-5de8-11ee-a917-39dd9c573fbe",
      "7d5e6c40-5de8-11ee-a917-39dd9c573fbe",
      "408e5690-5de8-11ee-a917-39dd9c573fbe",
      "0ee2bb40-5de8-11ee-a917-39dd9c573fbe",
      "deee31b0-5dda-11ee-a917-39dd9c573fbe",
      "95ed61c0-5dda-11ee-a917-39dd9c573fbe",
      "3e33cd20-5dda-11ee-a917-39dd9c573fbe",
      "18697ae0-5d8a-11ee-a917-39dd9c573fbe",
      "97eba690-5d89-11ee-a917-39dd9c573fbe",
      "a5412d60-5d6b-11ee-a917-39dd9c573fbe",
      "421bd900-5d67-11ee-a917-39dd9c573fbe",
      "0ea086c0-5d67-11ee-a917-39dd9c573fbe",
      "31874c40-5d63-11ee-a917-39dd9c573fbe",
      "e3fa1660-5d62-11ee-a917-39dd9c573fbe",
      "b4fcd230-5d62-11ee-a917-39dd9c573fbe",
      "2e10d370-6785-11ee-b2fe-d74fc1d80a28",
      "1fef93d0-6785-11ee-b2fe-d74fc1d80a28",
      "110f7100-6785-11ee-b2fe-d74fc1d80a28",
      "fc8d80a0-6784-11ee-b2fe-d74fc1d80a28",
      "f04a01b0-6784-11ee-b2fe-d74fc1d80a28",
      "e0bc12b0-6784-11ee-b2fe-d74fc1d80a28",
      "95587390-6784-11ee-b2fe-d74fc1d80a28",
      "4bf95700-6784-11ee-b2fe-d74fc1d80a28",
      "3f992850-6784-11ee-b2fe-d74fc1d80a28",
      "332cebb0-6784-11ee-b2fe-d74fc1d80a28",
      "28fc6e40-6784-11ee-b2fe-d74fc1d80a28",
      "1d0365d0-6784-11ee-b2fe-d74fc1d80a28",
      "12d55960-6784-11ee-b2fe-d74fc1d80a28",
      "d93c79e0-6783-11ee-b2fe-d74fc1d80a28",
      "cf0b8740-6783-11ee-b2fe-d74fc1d80a28",
      "c517c4b0-6783-11ee-b2fe-d74fc1d80a28",
      "bbbf30b0-6783-11ee-b2fe-d74fc1d80a28",
      "b0e246a0-6783-11ee-b2fe-d74fc1d80a28",
      "a6936bc0-6783-11ee-b2fe-d74fc1d80a28",
      "97da58f0-6783-11ee-b2fe-d74fc1d80a28",
      "8ddfb890-6783-11ee-b2fe-d74fc1d80a28",
      "831c49f0-6783-11ee-b2fe-d74fc1d80a28",
      "7611d180-6783-11ee-b2fe-d74fc1d80a28",
      "6b33fd10-6783-11ee-b2fe-d74fc1d80a28",
      "5f444370-6783-11ee-b2fe-d74fc1d80a28",
      "54b6b1e0-6783-11ee-b2fe-d74fc1d80a28",
      "4a15bf60-6783-11ee-b2fe-d74fc1d80a28",
      "2b01a990-6783-11ee-b2fe-d74fc1d80a28",
      "19bc4690-6783-11ee-b2fe-d74fc1d80a28",
      "0ea33de0-6783-11ee-b2fe-d74fc1d80a28",
      "1f28e640-6776-11ee-b6ed-1931e19377e6",
      "cd2209b0-5e62-11ee-af0c-cf999a695297",
      "c3613e00-5e62-11ee-af0c-cf999a695297",
      "b43b3890-5e62-11ee-af0c-cf999a695297",
      "a89a3b30-5e62-11ee-af0c-cf999a695297",
      "99b66ee0-5e62-11ee-af0c-cf999a695297",
      "8faade90-5e62-11ee-af0c-cf999a695297",
      "8167e620-5e62-11ee-af0c-cf999a695297",
      "75e32350-5e62-11ee-af0c-cf999a695297",
      "6bec5380-5e62-11ee-af0c-cf999a695297",
      "60fc2f90-5e62-11ee-af0c-cf999a695297",
      "555342f0-5e62-11ee-af0c-cf999a695297",
      "49e849b0-5e62-11ee-af0c-cf999a695297",
      "01f9ad10-5e62-11ee-af0c-cf999a695297",
      "f0b24e40-5e61-11ee-af0c-cf999a695297",
      "d5733540-5e61-11ee-af0c-cf999a695297",
      "cac8a5d0-5e61-11ee-af0c-cf999a695297",
      "a9b845a0-6837-11ee-bd32-6134433c312a",
      "9f2d2510-6837-11ee-bd32-6134433c312a",
      "94899a80-6837-11ee-bd32-6134433c312a",
      "836c31e0-6837-11ee-bd32-6134433c312a",
      "78317060-6837-11ee-bd32-6134433c312a",
      "6f15be50-6837-11ee-bd32-6134433c312a",
      "63af31e0-6837-11ee-bd32-6134433c312a",
      "599549b0-6837-11ee-bd32-6134433c312a",
      "4eeb7d90-6837-11ee-bd32-6134433c312a",
      "32f6a920-6837-11ee-bd32-6134433c312a",
      "213b79e0-6837-11ee-bd32-6134433c312a",
      "166e2030-6837-11ee-bd32-6134433c312a",
      "fbaa9fd0-6836-11ee-bd32-6134433c312a",
      "f1a43fa0-6836-11ee-bd32-6134433c312a",
      "e48ecab0-6836-11ee-bd32-6134433c312a",
      "d17061f0-6836-11ee-bd32-6134433c312a",
      "c3915b70-6836-11ee-bd32-6134433c312a",
      "b69e1480-6836-11ee-bd32-6134433c312a",
      "a6202030-6836-11ee-bd32-6134433c312a",
      "96838b30-6836-11ee-bd32-6134433c312a",
      "8bcb8e40-6836-11ee-bd32-6134433c312a",
      "7295b2c0-6836-11ee-bd32-6134433c312a",
      "677026f0-6836-11ee-bd32-6134433c312a",
      "7fbc3030-679d-11ee-bd32-6134433c312a",

    ];
    return adrenalineSKUs;
  }
}
