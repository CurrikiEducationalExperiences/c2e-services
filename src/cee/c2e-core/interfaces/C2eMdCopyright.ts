import C2eDigitalDocument from "./C2eDigitalDocument";
import C2ePersona from "./C2ePersona";
import JsonLd from "./JsonLd";

interface C2eMdCopyright extends JsonLd {
    license: C2eDigitalDocument;
    copyrightHolder: C2ePersona;
    copyrightNotice: string;
    copyrightYear: string;
    copyrightFooter: string;

    setCopyrightHolder(copyrightHolder: C2ePersona): void;
    getCopyrightHolder(): C2ePersona | undefined;
    setC2eLicense(license: C2eDigitalDocument): void;
    getC2eLicense(): C2eDigitalDocument | undefined;
    setCopyrightNotic(copyrightNotice: string): void;
    getCopyrightNotic(): string | undefined;
    setCopyrightFooter(copyRightFooter: string): void;
    getCopyrightFooter(): string | undefined;
    setCopyrightYear(copyrightYear: string): void;
    getCopyrightYear(): string | undefined;

}

export default C2eMdCopyright;
