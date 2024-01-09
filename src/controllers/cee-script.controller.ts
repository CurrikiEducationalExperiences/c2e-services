import {inject} from '@loopback/core';
import {
  repository
} from '@loopback/repository';
import {
  SchemaObject,
  getModelSchemaRef,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {CeeMedia} from '../models';
import {CeeListingRepository, CeeMediaCeeRepository, CeeMediaRepository, CeeRepository} from '../repositories';
import {FileUploadHandler} from '../types';

// schema for metadata update
const mdUpdateSchema: SchemaObject = {
  title: 'C2E metadata update',
  type: 'object',
  properties: {
    limit: {
      type: 'integer',
    }
  }
};

export class CeeScriptController {
  constructor(
    @repository(CeeMediaRepository)
    public ceeMediaRepository: CeeMediaRepository,
    @repository(CeeMediaCeeRepository)
    public ceeMediaCeeRepository: CeeMediaCeeRepository,
    @repository(CeeRepository)
    public ceeRepository: CeeRepository,
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @repository(CeeListingRepository)
    public ceeListingRepository: CeeListingRepository
  ) { }

  @post('/c2e/update-manifest')
  @response(200, {
    description: 'CeeMedia model instance',
    content: {'application/json': {schema: getModelSchemaRef(CeeMedia)}},
  })
  async updateManifest(
    @requestBody({
      content: {
        'application/json': {
          schema: mdUpdateSchema,
        },
      },
    })
    ceeScriptRequest: any,
  ): Promise<any> {
    let rowsUpdated = 0;
    const limit = ceeScriptRequest.limit;
    let lastCee = undefined;
    let lastCeePreview = undefined;

    const result = await this.ceeRepository.getByMediaWithMetadata(limit);
    await result.forEach(async (cee: any) => {
      const metadata = cee.metadata;
      const metadataObj = metadata ? JSON.parse(metadata) : undefined;
      const metadataKeys = metadataObj ? Object.keys(metadataObj) : undefined;
      //console.log('metadataKeys', metadataKeys);


      const manifest = cee.manifest;
      const manifestObj = manifest ? {...manifest} : undefined;
      const manifestKeys = manifestObj ? Object.keys(manifestObj) : undefined;
      //console.log('manifestKeys', manifestKeys);

      const hasMetadata = metadataKeys && metadataKeys.length > 0;
      const hasManifest = manifestKeys && manifestKeys.length > 0;

      if (hasManifest && hasMetadata) {
        //console.log('metadataObj', metadataObj);
        const copyrightNotice = metadataObj.copyright;
        const copyrightFooter = `From ${metadataObj.title}, <a href="#" id="copyrightNotice">Copyright Notice</a>. Used by permission of John Wiley & Sons, Inc.`;

        const copyright = {
          ...manifestObj.c2eMetadata.copyright,
          copyrightNotice,
          copyrightFooter
        };
        manifestObj.c2eMetadata.copyright = copyright;

        if (metadataObj.creator) {
          const author = {
            ...manifestObj.c2eMetadata.author,
            name: metadataObj.creator,
            email: '',
            '@id': manifestObj['@id'] + '/author/id/' + metadataObj.creator.split(' ').join('-')
          };
          manifestObj.c2eMetadata.author = author;
        }

        // console.log('@ID: ', manifestObj['@id'] + '/author/id/' + metadataObj.creator.split(' ').join('-'));
        // console.log('manifestObj', manifestObj);
        await this.ceeRepository.updateById(cee.id, {manifest: manifestObj});
        lastCee = await this.ceeRepository.findById(cee.id);
        //console.log('lastCee >>', lastCee);

        if (cee.type === 'master') {
          // get CeeListing by ceeMasterId
          const ceeListing = await this.ceeListingRepository.findOne({where: {ceeMasterId: cee.id}});
          // console.log('ceeListing...', ceeListing);
          if (ceeListing) {
            // get cee preview
            const ceePreview = await this.ceeRepository.findById(ceeListing.ceePreviewId);
            const ceePreviewManifest = ceePreview?.manifest;
            const ceePreviewManifestObj: any = ceePreviewManifest ? {...ceePreviewManifest} : undefined;
            const ceePreviewCopyright = {
              ...ceePreviewManifestObj.c2eMetadata.copyright,
              copyrightNotice,
              copyrightFooter
            };
            ceePreviewManifestObj.c2eMetadata.copyright = ceePreviewCopyright;

            if (metadataObj.creator) {
              const ceePreviewAuthor = {
                ...ceePreviewManifestObj.c2eMetadata.author,
                name: metadataObj.creator,
                email: '',
                '@id': ceePreviewManifestObj['@id'] + '/author/id/' + metadataObj.creator.split(' ').join('-')
              };
              ceePreviewManifestObj.c2eMetadata.author = ceePreviewAuthor;
            }

            await this.ceeRepository.updateById(ceePreview.id, {manifest: ceePreviewManifestObj});
            lastCeePreview = await this.ceeRepository.findById(ceePreview.id);
            //console.log('lastCeePreview >> ', lastCeePreview);

            //console.log('ceePreviewManifestObj', ceePreviewManifestObj);
          }
        }

        rowsUpdated++;
        //console.log('rowsUpdated', rowsUpdated);
      }
    });

    //console.log('XrowsUpdated', rowsUpdated);
    return {
      rowsUpdated: rowsUpdated,
      lastCee: lastCee,
      lastCeePreview: lastCeePreview
    };
  }
}
