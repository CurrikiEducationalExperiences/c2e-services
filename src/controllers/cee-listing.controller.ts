import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
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
import {ceeListByMediaRequest} from '../cee/openapi-schema';
import {protectCee} from '../cee/utils';
import {listToStore} from '../cee/utils/list-cee';
import {CeeListing, CeeProductWcStore} from '../models';
import {CeeListingRepository, CeeMediaCeeRepository, CeeMediaRepository, CeeRepository, CeeStoreRepository, CeeWriterRepository} from '../repositories';

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
    public ceeMediaCeeRepository: CeeMediaCeeRepository
  ) { }


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

    // making master cee
    const ceeMasterWriter = new CeeWriter(
      ceeMasterRecord,
      ceeMasterLicensee,
      ceeMasterCopyrightHolder,
      ceePublisher,
      ceeMediaRecord.resource,
      'epub',
      (ceeMediaParentRecord?.title ? ceeMediaParentRecord.title : ''),
      identifierValue,
      identifierType,
      'draft'
    );
    ceeMasterWriter.setLicenseType(ceeListRequest?.licenseType);
    ceeMasterWriter.setLicenseTerms(ceeListRequest?.licenseTerms);
    ceeMasterWriter.setLicensePrice(ceeListRequest?.price);
    ceeMasterWriter.setLicenseIdentifier('c2e-lsc-master');
    ceeMasterWriter.setLicenseDateCreated(new Date().toISOString());
    ceeMasterWriter.setLicenseExpires(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString());
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
      (ceeMediaParentRecord?.title ? ceeMediaParentRecord.title : ''),
      identifierValue,
      identifierType,
      'preview'
    );
    ceePreviewWriter.setLicenseType(ceeListRequest?.licenseType);
    ceePreviewWriter.setLicenseTerms(ceeListRequest?.licenseTerms);
    ceePreviewWriter.setLicensePrice(ceeListRequest?.price);
    ceePreviewWriter.setLicenseIdentifier('c2e-lsc-preview');
    ceePreviewWriter.setLicenseDateCreated(new Date().toISOString());
    ceePreviewWriter.setLicenseExpires(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString());
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
    await listToStore(ceeStoreConfig, ceeProductWcStore);

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

  @del('/c2e-listings/{id}')
  @response(204, {
    description: 'CeeListing DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.ceeListingRepository.deleteById(id);
  }
  */
}
