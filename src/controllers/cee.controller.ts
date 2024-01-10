import {inject} from '@loopback/core';
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
  patch,
  post,
  put,
  requestBody,
  response,
  ResponseObject,
  RestBindings
} from '@loopback/rest';
import crypto from 'crypto';
import {once} from 'events';
import {createReadStream, createWriteStream, ReadStream, statSync} from 'fs';
import C2eLicenseeLd from '../cee/c2e-core/classes/C2eLicenseeLd';
import C2eMdCopyrightHolderLd from '../cee/c2e-core/classes/C2eMdCopyrightHolderLd';
import C2ePublisherLd from '../cee/c2e-core/classes/C2ePublisherLd';
import {C2E_ORGANIZATION_TYPE} from '../cee/c2e-core/constants';
import {CeeWriter} from '../cee/cee-writer/cee-writer';
import {ceeCreateByIdSchema, ceeCreateByMediaSchema} from '../cee/openapi-schema';
import {encryptCee, protectCee} from '../cee/utils';
import {checkIntegrationToken} from '../cee/utils/gapi';
import {TEMP_FOLDER} from '../config';
import {Cee} from '../models';
import {CeeLicenseeRepository, CeeLicenseRepository, CeeMediaCeeRepository, CeeMediaRepository, CeeRepository} from '../repositories';

export class CeeController {
  constructor(
    @repository(CeeRepository)
    public ceeRepository: CeeRepository,
    @repository(CeeMediaRepository)
    public ceeMediaRepository: CeeMediaRepository,
    @repository(CeeLicenseRepository)
    public ceeLicenseRepository: CeeLicenseRepository,
    @repository(CeeMediaCeeRepository)
    public ceeMediaCeeRepository: CeeMediaCeeRepository,
    @repository(CeeLicenseeRepository)
    public ceeLicenseeRepository: CeeLicenseeRepository,
  ) { }



  @post('/c2e/licensed', {
    responses: {
      200: {
        content: {
          'application/octet-stream': {},
        },
      },
    },
  })
  async createLicensedCee(
    @requestBody({
      content: {
        'application/json': {
          schema: ceeCreateByIdSchema,
        },
      },
    })
    ceeRequest: any,
    @inject(RestBindings.Http.RESPONSE) response: ResponseObject,
  ): Promise<any> {
    const authCheck = await checkIntegrationToken(this.ceeLicenseeRepository, ceeRequest.email, ceeRequest.secret);
    if (!authCheck)
      throw new Error('Authentication failed');

    const ceeRecord = await this.ceeRepository.findById(ceeRequest.ceeId);
    const ceeLicenseRecord = await this.ceeLicenseRepository.findOne({where: {ceeId: ceeRecord.id}});
    const ceeLicenseeRecord = await this.ceeLicenseeRepository.findById(ceeLicenseRecord?.licenseeId ? ceeLicenseRecord.licenseeId : '');
    if (!ceeLicenseeRecord || ceeLicenseeRecord.email !== ceeRequest.email)
      throw new Error('Invalid license');

    let fileStream = null;
    const manifest = Object.assign(ceeRecord.manifest ? ceeRecord.manifest : {});
    const license = manifest.c2eMetadata?.copyright?.license;
    const copyrightHolder = manifest.c2eMetadata?.copyright?.copyrightHolder;
    const copyrightNotice = manifest.c2eMetadata?.copyright?.copyrightNotice;
    const copyrightFooter = manifest.c2eMetadata?.copyright?.copyrightFooter;
    const publisher = manifest.c2eMetadata?.publisher;

    const licenseType = license?.additionalType ? license.additionalType : '';
    const licenseKey = license?.identifier?.value ? license.identifier.value : '';
    const licenseTerms = license?.usageInfo?.hasDefinedTerm?.name ? license?.usageInfo?.hasDefinedTerm?.name : '';
    const licenseDate = license?.dateCreated ? license.dateCreated : '';
    const licenseEndDate = license?.expires ? license.expires : '';
    const price = license?.offers?.price ? license.offers.price : '0';

    const ceeMediaCeeRecord = await this.ceeMediaCeeRepository.findOne({where: {ceeId: ceeRecord.id}});
    if (ceeMediaCeeRecord) {
      const ceeMediaRecord = await this.ceeMediaRepository.findById(ceeMediaCeeRecord.ceeMediaId);
      const ceeMediaParentRecord = ceeMediaRecord?.parentId ? await this.ceeMediaRepository.findById(ceeMediaRecord.parentId) : null;

      const ceeLicensedLicensee = Object.assign(new C2eLicenseeLd(ceeRecord.id), {name: ceeLicenseeRecord.name, email: ceeLicenseeRecord.email, url: ceeLicenseeRecord.url});
      const ceeLicensedCopyrightHolder = Object.assign(
        new C2eMdCopyrightHolderLd(ceeRecord.id, C2E_ORGANIZATION_TYPE),
        {name: copyrightHolder?.name, email: copyrightHolder?.email, url: copyrightHolder?.url}
      );
      const ceeLicensedPublisher = Object.assign(new C2ePublisherLd(ceeRecord.id, C2E_ORGANIZATION_TYPE),
        {name: publisher?.name, email: publisher?.email, url: publisher?.url}
      );

      // making licensed cee
      const ceeLicensedWriter = new CeeWriter(
        ceeRecord,
        ceeLicensedLicensee,
        ceeLicensedCopyrightHolder,
        ceeLicensedPublisher,
        ceeMediaRecord.resource,
        'epub',
        (ceeMediaParentRecord?.title ? ceeMediaParentRecord.title : ''),
        ceeMediaRecord.identifier,
        ceeMediaRecord.identifierType,
        'published'
      );
      ceeLicensedWriter.setLicenseType(licenseType);
      ceeLicensedWriter.setLicenseTerms(licenseTerms);
      ceeLicensedWriter.setLicensePrice(price);
      ceeLicensedWriter.setLicenseIdentifier(licenseKey);
      ceeLicensedWriter.setLicenseDateCreated(licenseDate);
      ceeLicensedWriter.setLicenseExpires(licenseEndDate);
      ceeLicensedWriter.setCopyRightFooter(copyrightFooter);
      ceeLicensedWriter.setCopyrightNotice(copyrightNotice);
      const ceeFileStream: ReadStream | Boolean = ceeLicensedWriter.write();
      if (ceeFileStream instanceof ReadStream && ceeLicenseRecord) {
        const filePath = `${TEMP_FOLDER}/${crypto.randomUUID()}`;
        const writeStream = createWriteStream(filePath);
        const stream = ceeFileStream.pipe(writeStream);
        await once(stream, 'finish');
        const encryptedCee = await encryptCee(filePath, ceeLicenseRecord.licenseKey, ceeRecord.id, true);

        const responsePath = ceeRequest.decrypt ? filePath : encryptedCee.localPath;
        // Set headers for file download
        response.setHeader('Content-Disposition', 'attachment; filename="' + 'c2eid-' + ceeRecord.id + '.c2e' + '"');
        response.setHeader('Content-Type', 'application/octet-stream'); // You can set the appropriate MIME type
        response.setHeader('Content-Length', statSync(responsePath).size.toString());

        // Stream the file to the response
        fileStream = createReadStream(responsePath);

        fileStream.on('data', (chunk) => {
          response.write(chunk, 'binary');
        });
        fileStream.on('end', () => {
          response.end();
        });
      } else {
        // throw error
        return response;
      }
    }

    return response;
  }

  @post('/c2e/media')
  @response(200, {
    description: 'Cee model instance',
    content: {'application/json': {schema: getModelSchemaRef(Cee)}},
  })
  async createByCeeMedia(
    @requestBody({
      content: {
        'application/json': {
          schema: ceeCreateByMediaSchema,
        },
      },
    })
    ceeMediaRequest: any,
  ): Promise<Cee> {

    //cee.title
    const ceeMediaRecord = await this.ceeMediaRepository.findById(ceeMediaRequest.ceeMediaId);
    const ceeMediaRecordParentRecord = ceeMediaRecord.parentId ? await this.ceeMediaRepository.findById(ceeMediaRecord.parentId) : null;
    const ceeRecord = await this.ceeRepository.create({title: ceeMediaRecord.title});
    const licensee = Object.assign(new C2eLicenseeLd(ceeRecord.id), {name: ceeMediaRequest.licensee.name, email: ceeMediaRequest.licensee.email, url: ceeMediaRequest.licensee.url});

    const publisher = Object.assign(new C2ePublisherLd(ceeRecord.id, C2E_ORGANIZATION_TYPE),
      {name: 'Curriki', email: 'writer@curriki.org', url: 'https://writer.curriki.org'}
    );

    const ceeWriter = new CeeWriter(
      ceeRecord,
      licensee,
      licensee,
      publisher,
      ceeMediaRecord.resource,
      'epub',
      (ceeMediaRecordParentRecord?.title ? ceeMediaRecordParentRecord.title : ''),
      (ceeMediaRecord.identifier ? ceeMediaRecord.identifier : ''),
      (ceeMediaRecord.identifierType ? ceeMediaRecord.identifierType : '')
    );

    const ceePreviewFileStream: ReadStream | Boolean = ceeWriter.write();
    await protectCee(ceePreviewFileStream, ceeRecord);
    return ceeRecord;
  }

  @post('/c2e')
  @response(200, {
    description: 'Cee model instance',
    content: {'application/json': {schema: getModelSchemaRef(Cee)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Cee, {
            title: 'NewCee',
            exclude: ['id'],
          }),
        },
      },
    })
    cee: Omit<Cee, 'id'>,
  ): Promise<Cee> {
    return this.ceeRepository.create(cee);
  }

  @get('/c2e/count')
  @response(200, {
    description: 'Cee model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Cee) where?: Where<Cee>,
  ): Promise<Count> {
    return this.ceeRepository.count(where);
  }

  @get('/c2e')
  @response(200, {
    description: 'Array of Cee model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Cee, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Cee) filter?: Filter<Cee>,
  ): Promise<Cee[]> {
    return this.ceeRepository.find(filter);
  }

  @patch('/c2e')
  @response(200, {
    description: 'Cee PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Cee, {partial: true}),
        },
      },
    })
    cee: Cee,
    @param.where(Cee) where?: Where<Cee>,
  ): Promise<Count> {
    return this.ceeRepository.updateAll(cee, where);
  }

  @get('/c2e/{id}')
  @response(200, {
    description: 'Cee model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Cee, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Cee, {exclude: 'where'}) filter?: FilterExcludingWhere<Cee>
  ): Promise<Cee> {
    return this.ceeRepository.findById(id, filter);
  }

  @patch('/c2e/{id}')
  @response(204, {
    description: 'Cee PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Cee, {partial: true}),
        },
      },
    })
    cee: Cee,
  ): Promise<void> {
    await this.ceeRepository.updateById(id, cee);
  }

  @put('/c2e/{id}')
  @response(204, {
    description: 'Cee PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() cee: Cee,
  ): Promise<void> {
    await this.ceeRepository.replaceById(id, cee);
  }

  @del('/c2e/{id}')
  @response(204, {
    description: 'Cee DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.ceeRepository.deleteById(id);
  }
}
