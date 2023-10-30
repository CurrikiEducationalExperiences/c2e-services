import {BootMixin} from '@loopback/boot';
import {generateUniqueId} from "@loopback/context";
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin, SchemaMigrationOptions} from '@loopback/repository';
import {RestApplication, RestBindings} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import multer from 'multer';
import path from 'path';
import {FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY} from './keys';
import {CeeMediaRepository, CeeStoreRepository, CeeWriterRepository} from './repositories';
import {MySequence} from './sequence';
export {ApplicationConfig};

export class C2EServices extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);
    this.bind(RestBindings.ERROR_WRITER_OPTIONS).to({debug: true});
    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    // Configure file upload with multer options
    this.configureFileUpload(options.fileStorageDirectory);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  async migrateSchema(options?: SchemaMigrationOptions) {
    await super.migrateSchema(options);
    const ceeMediaRepository = await this.getRepository(CeeMediaRepository);
    const found = await ceeMediaRepository.findOne({where: {title: 'Test Ebook'}});
    if (!found) {
      await ceeMediaRepository.create({title: 'Test Ebook', type: 'epub', resource: '9781119861683.epub'});
    }

    // cee writer seed
    const ceeWriterRepository = await this.getRepository(CeeWriterRepository);
    const foundWriter = await ceeWriterRepository.findOne({where: {email: 'writer@curriki.org'}});
    if (!foundWriter) {
      await ceeWriterRepository.create({name: 'C2E Writer', email: 'writer@curriki.org', url: 'https://www.curriki.org'});
    }

    // cee store seed
    const ceeStoreRepository = await this.getRepository(CeeStoreRepository);
    const foundStore = await ceeStoreRepository.findOne({where: {email: 'store@wiley.com'}});
    if (!foundStore) {
      await ceeStoreRepository.create({
        name: 'Wiley',
        email: 'store@wiley.com',
        url: 'https://www.wiley.com',
        APIEndpoint: 'https://adrenaline-education.com/',
        APIConsumerKey: 'ck_5c45dce8c24c026574e0c899da2959e7439d94f2',
        APIConsumerSecret: 'cs_256eefbb52af5a202b3e3fb6e6afced1a3d2656b',
        APIVersion: 'wc/v3'
      });
    }
  }

  /**
   * Configure `multer` options for file upload
   */
  protected configureFileUpload(destination?: string) {
    // Upload files to `dist/.sandbox` by default
    destination = destination ?? path.join(__dirname, '../public/c2e-media-storage');
    this.bind(STORAGE_DIRECTORY).to(destination);
    const multerOptions: multer.Options = {
      storage: multer.diskStorage({
        destination,
        // Use the original file name as is
        filename: (req, file, cb) => {
          file.originalname = generateUniqueId() + '-' + file.originalname;
          cb(null, file.originalname);
        },
      }),
    };
    // Configure the file upload service with multer options
    this.configure(FILE_UPLOAD_SERVICE).to(multerOptions);
  }
}
