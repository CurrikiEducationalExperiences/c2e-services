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
import {CeeStore} from '../models';
import {CeeStoreRepository} from '../repositories';

export class CeeStoreController {
  constructor(
    @repository(CeeStoreRepository)
    public ceeStoreRepository: CeeStoreRepository,
  ) { }

  @post('/c2e-stores')
  @response(200, {
    description: 'CeeStore model instance',
    content: {'application/json': {schema: getModelSchemaRef(CeeStore)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeStore, {
            title: 'NewCeeStore',
            exclude: ['id'],
          }),
        },
      },
    })
    ceeStore: Omit<CeeStore, 'id'>,
  ): Promise<CeeStore> {
    return this.ceeStoreRepository.create(ceeStore);
  }

  @get('/c2e-stores/count')
  @response(200, {
    description: 'CeeStore model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(CeeStore) where?: Where<CeeStore>,
  ): Promise<Count> {
    return this.ceeStoreRepository.count(where);
  }

  @get('/c2e-stores')
  @response(200, {
    description: 'Array of CeeStore model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(CeeStore, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(CeeStore) filter?: Filter<CeeStore>,
  ): Promise<CeeStore[]> {
    return this.ceeStoreRepository.find(filter);
  }

  @patch('/c2e-stores')
  @response(200, {
    description: 'CeeStore PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeStore, {partial: true}),
        },
      },
    })
    ceeStore: CeeStore,
    @param.where(CeeStore) where?: Where<CeeStore>,
  ): Promise<Count> {
    return this.ceeStoreRepository.updateAll(ceeStore, where);
  }

  @get('/c2e-stores/{id}')
  @response(200, {
    description: 'CeeStore model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(CeeStore, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(CeeStore, {exclude: 'where'}) filter?: FilterExcludingWhere<CeeStore>
  ): Promise<CeeStore> {
    return this.ceeStoreRepository.findById(id, filter);
  }

  @patch('/c2e-stores/{id}')
  @response(204, {
    description: 'CeeStore PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeStore, {partial: true}),
        },
      },
    })
    ceeStore: CeeStore,
  ): Promise<void> {
    await this.ceeStoreRepository.updateById(id, ceeStore);
  }

  @put('/c2e-stores/{id}')
  @response(204, {
    description: 'CeeStore PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() ceeStore: CeeStore,
  ): Promise<void> {
    await this.ceeStoreRepository.replaceById(id, ceeStore);
  }

  @del('/c2e-stores/{id}')
  @response(204, {
    description: 'CeeStore DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.ceeStoreRepository.deleteById(id);
  }
}
