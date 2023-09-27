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
} from '@loopback/rest';
import {CeeLicenseDownload} from '../models';
import {CeeLicenseDownloadRepository} from '../repositories';

export class CeeLicenseDownloadController {
  constructor(
    @repository(CeeLicenseDownloadRepository)
    public ceeLicenseDownloadRepository: CeeLicenseDownloadRepository,
  ) { }

  @post('/c2e-license-downloads')
  @response(200, {
    description: 'CeeLicenseDownload model instance',
    content: {'application/json': {schema: getModelSchemaRef(CeeLicenseDownload)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeLicenseDownload, {
            title: 'NewCeeLicenseDownload',
            exclude: ['id'],
          }),
        },
      },
    })
    ceeLicenseDownload: Omit<CeeLicenseDownload, 'id'>,
  ): Promise<CeeLicenseDownload> {
    return this.ceeLicenseDownloadRepository.create(ceeLicenseDownload);
  }

  @get('/c2e-license-downloads/count')
  @response(200, {
    description: 'CeeLicenseDownload model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(CeeLicenseDownload) where?: Where<CeeLicenseDownload>,
  ): Promise<Count> {
    return this.ceeLicenseDownloadRepository.count(where);
  }

  @get('/c2e-license-downloads')
  @response(200, {
    description: 'Array of CeeLicenseDownload model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(CeeLicenseDownload, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(CeeLicenseDownload) filter?: Filter<CeeLicenseDownload>,
  ): Promise<CeeLicenseDownload[]> {
    return this.ceeLicenseDownloadRepository.find(filter);
  }

  @patch('/c2e-license-downloads')
  @response(200, {
    description: 'CeeLicenseDownload PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeLicenseDownload, {partial: true}),
        },
      },
    })
    ceeLicenseDownload: CeeLicenseDownload,
    @param.where(CeeLicenseDownload) where?: Where<CeeLicenseDownload>,
  ): Promise<Count> {
    return this.ceeLicenseDownloadRepository.updateAll(ceeLicenseDownload, where);
  }

  @get('/c2e-license-downloads/{id}')
  @response(200, {
    description: 'CeeLicenseDownload model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(CeeLicenseDownload, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(CeeLicenseDownload, {exclude: 'where'}) filter?: FilterExcludingWhere<CeeLicenseDownload>
  ): Promise<CeeLicenseDownload> {
    return this.ceeLicenseDownloadRepository.findById(id, filter);
  }

  @patch('/c2e-license-downloads/{id}')
  @response(204, {
    description: 'CeeLicenseDownload PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeLicenseDownload, {partial: true}),
        },
      },
    })
    ceeLicenseDownload: CeeLicenseDownload,
  ): Promise<void> {
    await this.ceeLicenseDownloadRepository.updateById(id, ceeLicenseDownload);
  }

  @put('/c2e-license-downloads/{id}')
  @response(204, {
    description: 'CeeLicenseDownload PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() ceeLicenseDownload: CeeLicenseDownload,
  ): Promise<void> {
    await this.ceeLicenseDownloadRepository.replaceById(id, ceeLicenseDownload);
  }

  @del('/c2e-license-downloads/{id}')
  @response(204, {
    description: 'CeeLicenseDownload DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.ceeLicenseDownloadRepository.deleteById(id);
  }
}
