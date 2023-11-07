import {CeeLicenseRepository, CeeLicenseeRepository, CeeListingRepository, CeeMediaCeeRepository, CeeMediaRepository, CeeRepository} from '../../repositories';
import C2eLicenseeLd from '../c2e-core/classes/C2eLicenseeLd';
import C2eMdCopyrightHolderLd from '../c2e-core/classes/C2eMdCopyrightHolderLd';
import C2ePublisherLd from '../c2e-core/classes/C2ePublisherLd';
import {C2E_ORGANIZATION_TYPE} from '../c2e-core/constants';
import {CeeWriter} from '../cee-writer/cee-writer';
import {generateLicenseKey} from './protect-cee';

export const licneseCee = async (
  licenseeEmail: string,
  licenseeName: string,
  ceeListingId: string,
  orderKey: string,
  ceeListingRepository: CeeListingRepository,
  ceeLicenseeRepository: CeeLicenseeRepository,
  ceeRepository: CeeRepository,
  ceeLicenseRepository: CeeLicenseRepository,
  ceeMediaCeeRepository: CeeMediaCeeRepository,
  ceeMediaRepository: CeeMediaRepository
) => {

  // find from ceeListingRepository if ceeListing by sku exists
  const ceeListingRecord = await ceeListingRepository.findOne({where: {id: ceeListingId}});
  const name = licenseeName;
  const email = licenseeEmail;

  // find from ceeLicenseeRepository if licensee by email exists
  let ceeLicenseeRecord = await ceeLicenseeRepository.findOne({where: {email}});
  if (!ceeLicenseeRecord) {
    // create new licensee
    ceeLicenseeRecord = await ceeLicenseeRepository.create({name, email});
  }

  const ceeMasterRecord = ceeListingRecord ? await ceeRepository.findById(ceeListingRecord.ceeMasterId) : null;
  const manifest = ceeMasterRecord ? Object.assign(ceeMasterRecord.manifest ? ceeMasterRecord.manifest : {}) : {};
  const license = manifest.c2eMetadata?.copyright?.license;
  const copyrightHolder = manifest.c2eMetadata?.copyright?.copyrightHolder;
  const publisher = manifest.c2eMetadata?.publisher;

  const ceeLicensedRecord = await ceeRepository.create({
    title: ceeMasterRecord?.title,
    description: ceeMasterRecord?.description,
    type: 'licensed',
  });

  const licenseType = license?.additionalType ? license.additionalType : '';
  const licenseKey = generateLicenseKey();
  const licenseTerms = license?.usageInfo?.hasDefinedTerm?.name ? license?.usageInfo?.hasDefinedTerm?.name : '';
  const licenseDate = license?.dateCreated ? license.dateCreated : new Date().toISOString();

  // licenseEndDate is 1 and half year from licenseDate
  const licenseEndDateCurrent = new Date();
  licenseEndDateCurrent.setFullYear(licenseEndDateCurrent.getFullYear() + 1);
  licenseEndDateCurrent.setMonth(licenseEndDateCurrent.getMonth() + 6);

  const licenseEndDate = license?.expires ? license.expires : licenseEndDateCurrent.toISOString();
  const price = license?.offers?.price ? license.offers.price : '0';

  // create new license
  await ceeLicenseRepository.create({
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

  // Get rescource. ***(Should be replaced with logic to get Midea from Master C2E package)***.
  const ceeMediaCeeRecord = ceeListingRecord ? await ceeMediaCeeRepository.findOne({where: {ceeId: ceeListingRecord.ceeMasterId}}) : null;
  if (ceeMediaCeeRecord) {
    const ceeMediaRecord = await ceeMediaRepository.findById(ceeMediaCeeRecord.ceeMediaId);
    const ceeMediaParentRecord = ceeMediaRecord?.parentId ? await ceeMediaRepository.findById(ceeMediaRecord.parentId) : null;

    const ceeLicensedLicensee = Object.assign(new C2eLicenseeLd(ceeLicensedRecord.id), {name: ceeLicenseeRecord.name, email: ceeLicenseeRecord.email, url: ceeLicenseeRecord.url});
    const ceeMasterRecordId = ceeMasterRecord?.id ? ceeMasterRecord.id : '';
    const ceeLicensedCopyrightHolder = Object.assign(
      new C2eMdCopyrightHolderLd(ceeMasterRecordId, C2E_ORGANIZATION_TYPE),
      {name: copyrightHolder?.name, email: copyrightHolder?.email, url: copyrightHolder?.url}
    );
    const ceeLicensedPublisher = Object.assign(new C2ePublisherLd(ceeMasterRecordId, C2E_ORGANIZATION_TYPE),
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
    await ceeRepository.updateById(ceeLicensedRecord.id, {manifest: ceeLicensedWriter.getC2eManifest()});
    await ceeMediaCeeRepository.create({ceeId: ceeLicensedRecord.id, ceeMediaId: ceeMediaRecord.id});
  }
}
