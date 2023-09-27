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
import {CeeWriter} from '../models';
import {CeeWriterRepository} from '../repositories';

export class CeeWriterController {
  constructor(
    @repository(CeeWriterRepository)
    public ceeWriterRepository: CeeWriterRepository,
  ) { }

  @post('/c2e-writers')
  @response(200, {
    description: 'CeeWriter model instance',
    content: {'application/json': {schema: getModelSchemaRef(CeeWriter)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeWriter, {
            title: 'NewCeeWriter',
            exclude: ['id'],
          }),
        },
      },
    })
    ceeWriter: Omit<CeeWriter, 'id'>,
  ): Promise<CeeWriter> {
    return this.ceeWriterRepository.create(ceeWriter);
  }

  @get('/c2e-writers/count')
  @response(200, {
    description: 'CeeWriter model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(CeeWriter) where?: Where<CeeWriter>,
  ): Promise<Count> {
    return this.ceeWriterRepository.count(where);
  }

  @get('/c2e-writers')
  @response(200, {
    description: 'Array of CeeWriter model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(CeeWriter, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(CeeWriter) filter?: Filter<CeeWriter>,
  ): Promise<CeeWriter[]> {
    return this.ceeWriterRepository.find(filter);
  }

  @patch('/c2e-writers')
  @response(200, {
    description: 'CeeWriter PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeWriter, {partial: true}),
        },
      },
    })
    ceeWriter: CeeWriter,
    @param.where(CeeWriter) where?: Where<CeeWriter>,
  ): Promise<Count> {
    return this.ceeWriterRepository.updateAll(ceeWriter, where);
  }

  @get('/c2e-writers/{id}')
  @response(200, {
    description: 'CeeWriter model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(CeeWriter, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(CeeWriter, {exclude: 'where'}) filter?: FilterExcludingWhere<CeeWriter>
  ): Promise<CeeWriter> {
    return this.ceeWriterRepository.findById(id, filter);
  }

  @patch('/c2e-writers/{id}')
  @response(204, {
    description: 'CeeWriter PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeWriter, {partial: true}),
        },
      },
    })
    ceeWriter: CeeWriter,
  ): Promise<void> {
    await this.ceeWriterRepository.updateById(id, ceeWriter);
  }

  @put('/c2e-writers/{id}')
  @response(204, {
    description: 'CeeWriter PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() ceeWriter: CeeWriter,
  ): Promise<void> {
    await this.ceeWriterRepository.replaceById(id, ceeWriter);
  }

  @del('/c2e-writers/{id}')
  @response(204, {
    description: 'CeeWriter DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.ceeWriterRepository.deleteById(id);
  }
}
