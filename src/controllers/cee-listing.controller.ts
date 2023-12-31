import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {ReadStream} from 'node:fs';
import C2eLicenseeLd from '../cee/c2e-core/classes/C2eLicenseeLd';
import C2eMdCopyrightHolderLd from '../cee/c2e-core/classes/C2eMdCopyrightHolderLd';
import C2ePublisherLd from '../cee/c2e-core/classes/C2ePublisherLd';
import {C2E_ORGANIZATION_TYPE} from '../cee/c2e-core/constants';
import {CeeWriter} from '../cee/cee-writer/cee-writer';
import {ceeListBatchRequest, ceeListBatchResponse, ceeListByLicensedMedia, ceeListByMediaRequest} from '../cee/openapi-schema';
import {listCeeByMedia} from '../cee/utils/list-cee';
import {protectCee} from '../cee/utils/protect-cee';
import {CeeListing, CeeProductWcStore} from '../models';
import {CeeLicenseRepository, CeeListingRepository, CeeMediaCeeRepository, CeeMediaRepository, CeeRepository, CeeStoreRepository, CeeWriterRepository} from '../repositories';

export class CeeListingController {
  constructor(
    @repository(CeeListingRepository)
    public ceeListingRepository: CeeListingRepository,
    @repository(CeeRepository)
    public ceeRepository: CeeRepository,
    @repository(CeeMediaRepository)
    public ceeMediaRepository: CeeMediaRepository,
    @repository(CeeWriterRepository)
    public ceeWriterRepository: CeeWriterRepository,
    @repository(CeeStoreRepository)
    public ceeStoreRepository: CeeStoreRepository,
    @repository(CeeMediaCeeRepository)
    public ceeMediaCeeRepository: CeeMediaCeeRepository,
    @repository('CeeLicenseRepository')
    public ceeLicenseRepository: CeeLicenseRepository,
  ) { }

  @post('/c2e-listings/media-to-license')
  async listingByMediaToLicense(
    @requestBody({
      content: {
        'application/json': {
          schema: ceeListByLicensedMedia,
        },
      },
    })
    ceeListByMediaRequest: any
  ): Promise<any> {
    return this.ceeListingRepository.listByMediaToLicense(ceeListByMediaRequest.ceeLicenseeEmail, ceeListByMediaRequest.limit);
  }

  @post('/c2e-listings/media-licensed')
  async listingByLicensedMedia(
    @requestBody({
      content: {
        'application/json': {
          schema: ceeListByLicensedMedia,
        },
      },
    })
    ceeListByMediaRequest: any
  ): Promise<any> {
    return this.ceeListingRepository.listByLicensedMedia(ceeListByMediaRequest.ceeLicenseeEmail);
  }

  @post('/c2e-listings/media/batch')
  @response(200, {
    description: 'Cee model instance',
    content: {'application/json': {schema: ceeListBatchResponse}},
  })
  async listByMediaBatch(
    @requestBody({
      content: {
        'application/json': {
          schema: ceeListBatchRequest,
        },
      },
    })
    ceeMediaBatchRequest: typeof ceeListBatchRequest
  ): Promise<string> {
    const ceeMediaToListRecords = await this.ceeMediaRepository.getAllIdsToList();
    const ceeMediaIdsToList = ceeMediaToListRecords
      .filter((ceeMediaToListRecord: any) => ceeMediaToListRecord.level > 1)
      .map((ceeMediaToListRecord: any) => ceeMediaToListRecord.id);

    const ceeWriterRecord = await this.ceeWriterRepository.findOne({where: {email: 'writer@curriki.org'}});
    const ceeStoreRecord = await this.ceeStoreRepository.findOne({where: {email: 'store@wiley.com'}});
    // iterate through ceeMediaBatchRequest.ceeMediaIds to find if any of them exist in the ceeMediaIdsToList
    if (ceeMediaBatchRequest.ceeMediaIds.length > 0) {
      ceeMediaBatchRequest.ceeMediaIds.forEach(async (ceeMediaId: string) => {
        if (ceeMediaIdsToList.includes(ceeMediaId) && ceeWriterRecord && ceeStoreRecord) {
          const ceeMediaRecord = await this.ceeMediaRepository.findById(ceeMediaId);
          const ceeListRequest = {
            ceeMediaId,
            ceeWriterId: ceeWriterRecord?.id,
            ceeStoreId: ceeStoreRecord?.id,
            title: ceeMediaRecord.title,
            description: ceeMediaRecord.description,
            identifier: {
              identifierType: ceeMediaRecord.identifierType,
              identifierValue: ceeMediaRecord.identifier
            },
            copyrightHolder: {
              name: "Mike Francis",
              email: "mike@curriki.org",
              url: "",
            },
            price: "0.00",
            licenseType: "usage",
            licenseTerms: ""
          };

          listCeeByMedia(
            this.ceeMediaRepository,
            ceeListRequest,
            ceeWriterRecord,
            ceeStoreRecord,
            this.ceeRepository,
            this.ceeMediaCeeRepository,
            this.ceeListingRepository,
            ceeMediaRecord
          );
        }
      });
    }
    return 'completed';
  }

  @post('/c2e-listings/media')
  @response(200, {
    description: 'Cee model instance',
    content: {'application/json': {schema: getModelSchemaRef(CeeListing)}},
  })
  async listByMedia(
    @requestBody({
      content: {
        'application/json': {
          schema: ceeListByMediaRequest,
        },
      },
    })
    ceeListRequest: any
  ): Promise<CeeListing> {

    const ceeMediaRecord = await this.ceeMediaRepository.findById(ceeListRequest.ceeMediaId);
    const ceeMediaParentRecord = ceeMediaRecord?.parentId ? await this.ceeMediaRepository.findById(ceeMediaRecord.parentId) : null;
    const ceeMediaInHierarchy = await this.ceeMediaRepository.findOneInHierarchy(ceeMediaRecord.id);

    const rootparentid = ceeMediaInHierarchy && ceeMediaInHierarchy?.rootparentid ? ceeMediaInHierarchy?.rootparentid : '';
    const ceeRootMedia = await this.ceeMediaRepository.findById(rootparentid);
    const rootCollection = ceeRootMedia?.collection ? ceeRootMedia?.collection : 'C2Es';
    const bookCollection = ceeRootMedia?.title ? ceeRootMedia?.title : 'C2E Collection';
    const unitCollection = ceeMediaInHierarchy?.parentid && ceeMediaInHierarchy?.parentid === rootparentid ? 'Default Collection' :
      (ceeMediaParentRecord?.title ? ceeMediaParentRecord?.title : 'Default Collection');

    const ceeWriterRecord = await this.ceeWriterRepository.findById(ceeListRequest.ceeWriterId);
    const ceeStoreRecord = await this.ceeStoreRepository.findById(ceeListRequest.ceeStoreId);

    const ceeMasterRecord = await this.ceeRepository.create({title: ceeMediaRecord.title});
    const ceePreviewRecord = await this.ceeRepository.create({title: ceeMediaRecord.title});

    const ceePreviewLicensee = Object.assign(new C2eLicenseeLd(ceePreviewRecord.id), {name: 'Preview C2E', email: 'preview-c2e@curriki.org', url: 'c2e.curriki.org/preview'});
    const ceePreviewCopyrightHolder = Object.assign(
      new C2eMdCopyrightHolderLd(ceePreviewRecord.id, C2E_ORGANIZATION_TYPE),
      {name: ceeListRequest?.copyrightHolder?.name, email: ceeListRequest?.copyrightHolder?.email, url: ceeListRequest?.copyrightHolder?.url}
    );
    const ceePublisher = Object.assign(new C2ePublisherLd(ceePreviewRecord.id, C2E_ORGANIZATION_TYPE),
      {name: ceeWriterRecord.name, email: ceeWriterRecord.email, url: ceeWriterRecord.url}
    );

    const ceeMasterLicensee = Object.assign(new C2eLicenseeLd(ceeMasterRecord.id), {name: 'Master C2E', email: 'master-c2e@curriki.org', url: 'c2e.curriki.org/master'});
    const ceeMasterCopyrightHolder = Object.assign(
      new C2eMdCopyrightHolderLd(ceeMasterRecord.id, C2E_ORGANIZATION_TYPE),
      {name: ceeListRequest?.copyrightHolder?.name, email: ceeListRequest?.copyrightHolder?.email, url: ceeListRequest?.copyrightHolder?.url}
    );

    const title = (ceeListRequest?.title ? ceeListRequest.title : 'No Title');
    const description = (ceeListRequest?.description ? ceeListRequest.description : 'No Description');
    const identifierValue = (ceeListRequest?.identifier?.identifierValue ? ceeListRequest.identifier.identifierValue : '');
    const identifierType = (ceeListRequest?.identifier?.identifierType ? ceeListRequest.identifier.identifierType : '');
    const price = (ceeListRequest?.price ? ceeListRequest.price : 0);
    const copyrightFooter = `From ${(ceeRootMedia?.title ? ceeRootMedia?.title : ceeMediaParentRecord?.title)}, <a href="#" id="copyrightNotice">Copyright Notice</a>. Used by permission of John Wiley & Sons, Inc.`;
    const copyrightNotice = `Copyright (c) 2024, John Wiley & Sons`;

    // making master cee
    const ceeMasterWriter = new CeeWriter(
      ceeMasterRecord,
      ceeMasterLicensee,
      ceeMasterCopyrightHolder,
      ceePublisher,
      ceeMediaRecord.resource,
      'epub',
      (ceeRootMedia?.title ? ceeRootMedia?.title : ceeMediaParentRecord?.title),
      identifierValue,
      identifierType,
      'draft'
    );

    // Breadcrumb will be created in same order as defined array below. For example:
    // "Computer Science > Java For Dummies > Unit 1: Introduction to Java" would be defined as:
    ceeMasterWriter.setBreadcrumb([rootCollection, bookCollection, unitCollection]);
    // Keywords are like tags which can be used for searching and filtering
    ceeMasterWriter.setKeywords(["Education", "Curriculum", "Curriki", "EPUB"]);

    ceeMasterWriter.setLicenseType(ceeListRequest?.licenseType);
    ceeMasterWriter.setLicenseTerms(ceeListRequest?.licenseTerms);
    ceeMasterWriter.setLicensePrice(ceeListRequest?.price);
    ceeMasterWriter.setLicenseIdentifier('c2e-lsc-master');
    ceeMasterWriter.setLicenseDateCreated(new Date().toISOString());
    ceeMasterWriter.setLicenseExpires(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString());
    ceeMasterWriter.setCopyrightNotice(copyrightNotice);
    ceeMasterWriter.setCopyRightFooter(copyrightFooter);
    ceeMasterWriter.write();
    await this.ceeRepository.updateById(ceeMasterRecord.id, {title, description, manifest: ceeMasterWriter.getC2eManifest(), type: 'master'});
    await this.ceeMediaCeeRepository.create({ceeId: ceeMasterRecord.id, ceeMediaId: ceeMediaRecord.id});

    // making preview cee
    const ceePreviewWriter = new CeeWriter(
      ceePreviewRecord,
      ceePreviewLicensee,
      ceePreviewCopyrightHolder,
      ceePublisher,
      ceeMediaRecord.resource,
      'epub',
      (ceeRootMedia?.title ? ceeRootMedia?.title : ceeMediaParentRecord?.title),
      identifierValue,
      identifierType,
      'preview'
    );

    // Breadcrumb will be created in same order as defined array below. For example:
    // "Computer Science > Java For Dummies > Unit 1: Introduction to Java" would be defined as:
    ceePreviewWriter.setBreadcrumb([rootCollection, bookCollection, unitCollection]);
    // Keywords are like tags which can be used for searching and filtering
    ceePreviewWriter.setKeywords(["Education", "Curriculum", "Curriki", "EPUB"]);

    ceePreviewWriter.setLicenseType(ceeListRequest?.licenseType);
    ceePreviewWriter.setLicenseTerms(ceeListRequest?.licenseTerms);
    ceePreviewWriter.setLicensePrice(ceeListRequest?.price);
    ceePreviewWriter.setLicenseIdentifier('c2e-lsc-preview');
    ceePreviewWriter.setLicenseDateCreated(new Date().toISOString());
    ceePreviewWriter.setLicenseExpires(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString());
    ceePreviewWriter.setCopyrightNotice(copyrightNotice);
    ceePreviewWriter.setCopyRightFooter(copyrightFooter);
    let ceePreviewFileStream: ReadStream | Boolean = ceePreviewWriter.write();
    await this.ceeRepository.updateById(ceePreviewRecord.id, {title, description, manifest: ceePreviewWriter.getC2eManifest(), type: 'preview'});
    await protectCee(ceePreviewFileStream, ceePreviewRecord);

    // making c2e listing
    const ceeListingRecord = await this.ceeListingRepository.create({ceePreviewId: ceePreviewRecord.id, ceeMasterId: ceeMasterRecord.id, ceeWriterId: ceeWriterRecord.id, ceeStoreId: ceeStoreRecord.id});

    // making wc product
    const ceeProductWcStore: CeeProductWcStore = new CeeProductWcStore();
    ceeProductWcStore.sku = ceeListingRecord.id;
    ceeProductWcStore.name = ceePreviewRecord.title;
    ceeProductWcStore.regular_price = price;
    const ceePreviewStorageUrl = `https://c2e-services-api.curriki.org/c2e-storage/c2eid-${ceePreviewRecord.id}.c2e`;
    const ceePlayerReader = `https://c2e-reader.curriki.org/preview/?c2e=${encodeURIComponent(ceePreviewStorageUrl)}`;
    const productDescription = `
    <p><a target="_blank" href="${ceePlayerReader}"><strong>Preview C2E</strong></a></p>
    <p>${description ? description : ''}</p>
    `;
    ceeProductWcStore.description = productDescription;
    ceeProductWcStore.virtual = true;
    ceeProductWcStore.images = [{src: 'https://adrenaline-education.com/wp-content/uploads/2023/08/C2E-Image.jpg', position: 0}];
    ceeProductWcStore.attributes = [
      {
        name: 'C2E Title',
        position: 0,
        visible: true,
        options: [
          title
        ]
      },
      {
        name: 'Book',
        position: 1,
        visible: true,
        options: [
          ceeMediaParentRecord?.title
        ]
      },
      {
        name: identifierType,
        position: 2,
        visible: true,
        options: [
          identifierValue
        ]
      },
      {
        name: 'C2E Copyright Owner',
        position: 3,
        visible: true,
        options: [
          `${ceeListRequest?.copyrightHolder?.name} (${ceeListRequest?.copyrightHolder?.email})`
        ]
      },
      {
        name: 'C2E Author',
        position: 4,
        visible: true,
        options: [
          `${ceeListRequest?.copyrightHolder?.name} (${ceeListRequest?.copyrightHolder?.email})`
        ]
      },
      {
        name: 'C2E Publisher',
        position: 5,
        visible: true,
        options: [
          `${ceePublisher.name} (${ceePublisher.email})`
        ]
      },
    ];

    // ceeStoreConfig will be dynamic and will be stored in the database and will be fetched by the ceeStoreId
    const ceeStoreConfig = {
      url: ceeStoreRecord.APIEndpoint,
      consumerKey: ceeStoreRecord.APIConsumerKey,
      consumerSecret: ceeStoreRecord.APIConsumerSecret,
      version: ceeStoreRecord.APIVersion
    };
    // await listToStore(ceeStoreConfig, ceeProductWcStore);

    return ceeListingRecord;
  }

  /*
  @post('/c2e-listings')
  @response(200, {
    description: 'CeeListing model instance',
    content: {'application/json': {schema: getModelSchemaRef(CeeListing)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeListing, {
            title: 'NewCeeListing',
            exclude: ['id'],
          }),
        },
      },
    })
    ceeListing: Omit<CeeListing, 'id'>,
  ): Promise<CeeListing> {
    return this.ceeListingRepository.create(ceeListing);
  }
  */

  @get('/c2e-listings/count')
  @response(200, {
    description: 'CeeListing model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(CeeListing) where?: Where<CeeListing>,
  ): Promise<Count> {
    return this.ceeListingRepository.count(where);
  }

  @get('/c2e-listings')
  @response(200, {
    description: 'Array of CeeListing model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(CeeListing, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(CeeListing) filter?: Filter<CeeListing>,
  ): Promise<CeeListing[]> {
    return this.ceeListingRepository.find(filter);
  }

  @get('/c2e-listings/manage')
  @response(200, {
    description: 'Array of CeeListing model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(CeeListing, {includeRelations: true}),
        },
      },
    },
  })
  async manage(
    @param.filter(CeeListing) filter?: Filter<CeeListing>,
  ): Promise<CeeListing[]> {
    return this.ceeListingRepository.listByMediaToManage();
  }

  /*
  @patch('/c2e-listings')
  @response(200, {
    description: 'CeeListing PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeListing, {partial: true}),
        },
      },
    })
    ceeListing: CeeListing,
    @param.where(CeeListing) where?: Where<CeeListing>,
  ): Promise<Count> {
    return this.ceeListingRepository.updateAll(ceeListing, where);
  }
  */

  @get('/c2e-listings/{id}')
  @response(200, {
    description: 'CeeListing model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(CeeListing, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(CeeListing, {exclude: 'where'}) filter?: FilterExcludingWhere<CeeListing>
  ): Promise<CeeListing> {
    return this.ceeListingRepository.findById(id, filter);
  }

  /*
  @patch('/c2e-listings/{id}')
  @response(204, {
    description: 'CeeListing PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeListing, {partial: true}),
        },
      },
    })
    ceeListing: CeeListing,
  ): Promise<void> {
    await this.ceeListingRepository.updateById(id, ceeListing);
  }

  @put('/c2e-listings/{id}')
  @response(204, {
    description: 'CeeListing PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() ceeListing: CeeListing,
  ): Promise<void> {
    await this.ceeListingRepository.replaceById(id, ceeListing);
  }
  */
  @del('/c2e-listings/{id}')
  @response(204, {
    description: 'CeeListing DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    // await this.ceeListingRepository.deleteById(id);
    const ceelisting = await this.ceeListingRepository.findById(id);
    const ceeListingLicenses = await this.ceeLicenseRepository.find({where: {ceeListingId: id}});

    ceeListingLicenses.forEach(async (ceeListingLicense) => {
      const licenseId = ceeListingLicense.id;
      const licensedCeeId = ceeListingLicense?.ceeId;
      await this.ceeLicenseRepository.deleteById(licenseId);
      if (licensedCeeId) {
        await this.ceeRepository.deleteById(licensedCeeId);
        await this.ceeMediaCeeRepository.deleteAll({ceeId: licensedCeeId});
      }
    });

    const ceePreviewId = ceelisting.ceePreviewId;
    const ceeMasterId = ceelisting.ceeMasterId;
    await this.ceeListingRepository.deleteById(id);
    await this.ceeRepository.deleteById(ceePreviewId);
    await this.ceeRepository.deleteById(ceeMasterId);
    await this.ceeMediaCeeRepository.deleteAll({ceeId: ceeMasterId});
  }

}
