import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where
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
  Response,
  response,
  RestBindings,
  SchemaObject
} from '@loopback/rest';
import C2eLicenseeLd from '../cee/c2e-core/classes/C2eLicenseeLd';
import C2eMdCopyrightHolderLd from '../cee/c2e-core/classes/C2eMdCopyrightHolderLd';
import C2ePublisherLd from '../cee/c2e-core/classes/C2ePublisherLd';
import {C2E_ORGANIZATION_TYPE} from '../cee/c2e-core/constants';
import {CeeWriter} from '../cee/cee-writer/cee-writer';
import {CeeLicense} from '../models';
import {CeeLicenseeRepository, CeeLicenseRepository, CeeListingRepository, CeeMediaCeeRepository, CeeMediaRepository, CeeRepository} from '../repositories';

class EmailData {
  constructor(public ceeName: string, public licenseKey: string, public licenseDate: string, public licenseEndDate: string) { }
}

const ceeLicenseBuyerRequest: SchemaObject = {
  title: 'Request C2E License by Buyer',
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
    },
  }
};

const ceeLicenseBuyerResponse: SchemaObject = {
  title: 'List C2E License by Buyer',
  type: 'array',
};

export class CeeLicenseController {
  constructor(
    @repository(CeeLicenseRepository)
    public ceeLicenseRepository: CeeLicenseRepository,
    @repository(CeeLicenseeRepository)
    public ceeLicenseeRepository: CeeLicenseeRepository,
    @repository(CeeListingRepository)
    public ceeListingRepository: CeeListingRepository,
    @repository(CeeMediaRepository)
    public ceeMediaRepository: CeeMediaRepository,
    @repository(CeeMediaCeeRepository)
    public ceeMediaCeeRepository: CeeMediaCeeRepository,
    @repository(CeeRepository)
    public ceeRepository: CeeRepository,
    @inject(RestBindings.Http.RESPONSE) private response: Response
  ) { }

  @post('/c2e-licenses/buyer')
  @response(200, {
    description: 'CeeLicense model instance',
    content: {'application/json': {schema: ceeLicenseBuyerResponse}},
  })
  async byBuyer(
    @requestBody({
      content: {
        'application/json': {
          schema: ceeLicenseBuyerRequest
        },
      },
    })
    ceeLicenseRequest: any,
  ): Promise<any> {
    // read email from request
    const email = ceeLicenseRequest.email;
    // find from ceeLicenseeRepository if licensee by email exists
    const ceeLicenseeRecord = await this.ceeLicenseeRepository.findOne({where: {email}});
    // find all ceeLicenseRepository by licenseeId order by createdAt desc
    const ceeLicenseRecords = await this.ceeLicenseRepository.find({where: {licenseeId: ceeLicenseeRecord?.id}, order: ['createdAt DESC']});
    // map ceeLicenseRecords to include cee, licensee
    const ceeLicenseRecordsWithCee = await Promise.all(ceeLicenseRecords.map(async (item: CeeLicense) => {
      const ceeRecord = item?.ceeId ? await this.ceeRepository.findById(item.ceeId) : null;
      return {
        license: item,
        licensee: ceeLicenseeRecord,
        cee: {id: ceeRecord?.id, title: ceeRecord?.title, description: ceeRecord?.description}
      };
    }));
    return ceeLicenseRecordsWithCee;
  }

  @post('/c2e-licenses')
  @response(200, {
    description: 'CeeLicense model instance',
    content: {'application/json': {schema: getModelSchemaRef(CeeLicense)}},
  })
  async create(@requestBody() request: any): Promise<any> {

    // check if request.order_key, request.billing.email, request.line_items, request.billing.first_name, request.billing.last_name exists
    const orderKey = request.hasOwnProperty('order_key') ? request.order_key : null;
    const billingEmail = request.hasOwnProperty('billing') && request.billing.hasOwnProperty('email') ? request.billing.email : null;
    const lineItems = request.hasOwnProperty('line_items') ? request.line_items : [];
    const billingFirstName = request.hasOwnProperty('billing') && request.billing.hasOwnProperty('first_name') ? request.billing.first_name : null;
    const billingLastName = request.hasOwnProperty('billing') && request.billing.hasOwnProperty('last_name') ? request.billing.last_name : null;

    let ok = true;
    let message = '';

    if (!orderKey || !billingEmail || !lineItems || !billingFirstName || !billingLastName) {
      // respond with error message with status code 400 object
      // this.response.status(400).send({message: 'Invalid request. Does not found Licensing request object'});
      ok = false;
      message = 'Invalid request. Does not found appropriate Licensing request';
    }

    if (ok) {

      /*
      const mailgunAuth = {
        auth: {
          api_key: "",
          domain: ""
        }
      };


      const transporter = nodemailer.createTransport(mg(mailgunAuth));
      const licensedC2Es: Array<EmailData> = []
      const buyerName = billingFirstName + ' ' + billingLastName;
      const buyerEmail = billingEmail;
      */

      // iterate through line_items and get the sku as ceeListingId
      for (const item of lineItems) {
        if (ok && item.hasOwnProperty('sku')) {

          // find from ceeListingRepository if ceeListing by sku exists
          let ceeListingRecord = await this.ceeListingRepository.findOne({where: {id: item.sku}});
          if (!ceeListingRecord) {
            ok = false;
            message = 'Invalid request. Does not found CeeListing object';
          } else {
            let name = billingFirstName + ' ' + billingLastName;
            let email = billingEmail;
            // find from ceeLicenseeRepository if licensee by email exists
            let ceeLicenseeRecord = await this.ceeLicenseeRepository.findOne({where: {email}});
            if (!ceeLicenseeRecord) {
              // create new licensee
              ceeLicenseeRecord = await this.ceeLicenseeRepository.create({name, email});
            }

            const ceeMasterRecord = await this.ceeRepository.findById(ceeListingRecord.ceeMasterId);
            let manifest = Object.assign(ceeMasterRecord.manifest ? ceeMasterRecord.manifest : {});
            let license = manifest.c2eMetadata?.copyright?.license;
            let copyrightHolder = manifest.c2eMetadata?.copyright?.copyrightHolder;
            let publisher = manifest.c2eMetadata?.publisher;

            const ceeLicensedRecord = await this.ceeRepository.create({
              title: ceeMasterRecord.title,
              description: ceeMasterRecord.description,
              type: 'licensed',
            });

            let licenseType = license?.additionalType ? license.additionalType : '';
            let licenseKey = 'pending';
            let licenseTerms = license?.usageInfo?.hasDefinedTerm?.name ? license?.usageInfo?.hasDefinedTerm?.name : '';
            let licenseDate = license?.dateCreated ? license.dateCreated : new Date().toISOString();

            // licenseEndDate is 1 and half year from licenseDate
            let licenseEndDateCurrent = new Date();
            licenseEndDateCurrent.setFullYear(licenseEndDateCurrent.getFullYear() + 1);
            licenseEndDateCurrent.setMonth(licenseEndDateCurrent.getMonth() + 6);

            let licenseEndDate = license?.expires ? license.expires : licenseEndDateCurrent.toISOString();
            let price = license?.offers?.price ? license.offers.price : '0';

            // create new license
            const ceeLicenseRecord = await this.ceeLicenseRepository.create({
              licenseKey,
              licenseType,
              licenseTerms,
              ceeListingId: ceeListingRecord?.id,
              licenseDate,
              licenseEndDate,
              licenseeId: ceeLicenseeRecord?.id,
              ceeId: ceeLicensedRecord.id,
              orderKey
            });

            licenseKey = 'c2e-lsc-' + ceeLicenseRecord.id;
            // update ceeLicenseRepository with new licenseKey
            await this.ceeLicenseRepository.updateById(ceeLicenseRecord.id, {licenseKey});

            // Get rescource. ***(Should be replaced with logic to get Midea from Master C2E package)***.
            const ceeMediaCeeRecord = await this.ceeMediaCeeRepository.findOne({where: {ceeId: ceeListingRecord.ceeMasterId}});
            if (ceeMediaCeeRecord) {
              const ceeMediaRecord = await this.ceeMediaRepository.findById(ceeMediaCeeRecord.ceeMediaId);
              const ceeMediaParentRecord = ceeMediaRecord?.parentId ? await this.ceeMediaRepository.findById(ceeMediaRecord.parentId) : null;

              const ceeLicensedLicensee = Object.assign(new C2eLicenseeLd(ceeLicensedRecord.id), {name: ceeLicenseeRecord.name, email: ceeLicenseeRecord.email, url: ceeLicenseeRecord.url});
              const ceeLicensedCopyrightHolder = Object.assign(
                new C2eMdCopyrightHolderLd(ceeMasterRecord.id, C2E_ORGANIZATION_TYPE),
                {name: copyrightHolder?.name, email: copyrightHolder?.email, url: copyrightHolder?.url}
              );
              const ceeLicensedPublisher = Object.assign(new C2ePublisherLd(ceeMasterRecord.id, C2E_ORGANIZATION_TYPE),
                {name: publisher?.name, email: publisher?.email, url: publisher?.url}
              );

              // making licensed cee
              const ceeLicensedWriter = new CeeWriter(
                ceeLicensedRecord,
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
              ceeLicensedWriter.setSkipC2ePackage(true);
              ceeLicensedWriter.setLicenseType(licenseType);
              ceeLicensedWriter.setLicenseTerms(licenseTerms);
              ceeLicensedWriter.setLicensePrice(price);
              ceeLicensedWriter.setLicenseIdentifier(licenseKey);
              ceeLicensedWriter.setLicenseDateCreated(licenseDate);
              ceeLicensedWriter.setLicenseExpires(licenseEndDate);
              ceeLicensedWriter.write();
              await this.ceeRepository.updateById(ceeLicensedRecord.id, {manifest: ceeLicensedWriter.getC2eManifest()});
              await this.ceeMediaCeeRepository.create({ceeId: ceeLicensedRecord.id, ceeMediaId: ceeMediaRecord.id});

              //licensedC2Es.push(new EmailData(item.name, licenseKey, licenseDate, licenseEndDate));
            }

          }
        }
      };

      /*
      let emailBody = `Hello <b>' ${buyerName} </b>
      <br><br> Thank you for your Order of C2E(s):`;

      const emailBodyWithC2EDetails = licensedC2Es.map((item: EmailData) => {
        return `
        <br ><b>${item.ceeName}</b>
        <br><br> Your License Key is <b>${item.licenseKey}</b>
        <br> License Start Date: <b>${item.licenseDate}</b>
        <br> License End Date: <b>${item.licenseEndDate}</b>`
      });
      emailBody = emailBody + emailBodyWithC2EDetails.join('') + `<br> Please use this License Key(s) to access your C2E(s).`;

      // send email
      const mailsent = await transporter.sendMail({
        from: 'postmaster@c2e.curriki.org',
        to: buyerEmail,
        subject: 'C2E license has been issued',
        html: emailBody,
      });
      console.log('mailsent : ', mailsent);
      */
    }

    if (ok) {
      this.response.status(200).send({message: 'License Created Successfully'});
    } else {
      this.response.status(400).send({message});
    }

  }

  /*
  @post('/c2e-licenses')
  @response(200, {
    description: 'CeeLicense model instance',
    content: {'application/json': {schema: getModelSchemaRef(CeeLicense)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeLicense, {
            title: 'NewCeeLicense',
            exclude: ['id'],
          }),
        },
      },
    })
    ceeLicense: Omit<CeeLicense, 'id'>,
  ): Promise<CeeLicense> {
    return this.ceeLicenseRepository.create(ceeLicense);
  }
  */

  @get('/c2e-licenses/count')
  @response(200, {
    description: 'CeeLicense model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(CeeLicense) where?: Where<CeeLicense>,
  ): Promise<Count> {
    return this.ceeLicenseRepository.count(where);
  }

  @get('/c2e-licenses')
  @response(200, {
    description: 'Array of CeeLicense model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(CeeLicense, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(CeeLicense) filter?: Filter<CeeLicense>,
  ): Promise<CeeLicense[]> {
    return this.ceeLicenseRepository.find(filter);
  }

  @patch('/c2e-licenses')
  @response(200, {
    description: 'CeeLicense PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeLicense, {partial: true}),
        },
      },
    })
    ceeLicense: CeeLicense,
    @param.where(CeeLicense) where?: Where<CeeLicense>,
  ): Promise<Count> {
    return this.ceeLicenseRepository.updateAll(ceeLicense, where);
  }

  @get('/c2e-licenses/{id}')
  @response(200, {
    description: 'CeeLicense model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(CeeLicense, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(CeeLicense, {exclude: 'where'}) filter?: FilterExcludingWhere<CeeLicense>
  ): Promise<CeeLicense> {
    return this.ceeLicenseRepository.findById(id, filter);
  }

  @patch('/c2e-licenses/{id}')
  @response(204, {
    description: 'CeeLicense PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CeeLicense, {partial: true}),
        },
      },
    })
    ceeLicense: CeeLicense,
  ): Promise<void> {
    await this.ceeLicenseRepository.updateById(id, ceeLicense);
  }

  @put('/c2e-licenses/{id}')
  @response(204, {
    description: 'CeeLicense PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() ceeLicense: CeeLicense,
  ): Promise<void> {
    await this.ceeLicenseRepository.replaceById(id, ceeLicense);
  }

  @del('/c2e-licenses/{id}')
  @response(204, {
    description: 'CeeLicense DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.ceeLicenseRepository.deleteById(id);
  }
}
