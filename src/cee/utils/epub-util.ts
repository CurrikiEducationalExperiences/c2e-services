import AdmZip from 'adm-zip';
import * as cheerioLib from 'cheerio';
import path from 'path';
import {CeeMedia} from '../../models';
import {CeeMediaRepository} from '../../repositories';

interface FileType {
  filename: string,
  path: string
}


interface NavPoint {
  label: string;
  src?: string;
  children?: NavPoint[];
}

export const epubSplitter = async (epub: string, ceeMediaRepository: CeeMediaRepository, parentCeeMediaId: string, isbn: string): Promise<boolean> => {

  const fs = require('fs');
  const admzip = require('adm-zip');
  const cheerio = require('cheerio');

  const walk = (dir: string, files: Object[] = []) => {
    const dirFiles = fs.readdirSync(dir)
    for (const f of dirFiles) {
      const stat = fs.lstatSync(dir + '/' + f)
      if (stat.isDirectory()) {
        walk(dir + '/' + f, files)
      } else {
        files.push({filename: f, path: dir + '/' + f})
      }
    }
    return files
  }


  const publicPath = path.join(__dirname, '../../../public');
  const file = epub;
  // Unzip to temp folder
  console.log('Unzipping epub');
  var zip = new admzip(file);
  zip.extractAllTo(path.join(publicPath, 'temp/tempbook'), true);
  // Read through the spine in content.opf
  const contentFileData = fs.readFileSync(path.join(publicPath, 'temp/tempbook/OPS/content.opf'), 'utf-8');
  const tocFileData = fs.readFileSync(path.join(publicPath, 'temp/tempbook/OPS/toc.ncx'), 'utf-8');
  const $content = cheerio.load(contentFileData, {xml: true});
  const $toc = cheerio.load(tocFileData, {xml: true});

  $content('itemref').each(async (i: any, item: any) => {
    const idref = item?.attribs?.idref;
    // Create new copy
    zip.extractAllTo(path.join(publicPath, `temp/${idref}`), true);

    // Editing content.opf (content manifest)
    const $innerContent = cheerio.load(contentFileData, {xml: true});
    const xhtmlFile = $innerContent(`#${idref}`)[0].attribs.href;
    // trace xhtmlFile as "navMap navPoint content src" in toc.ncx
    const navpointContentTag = $toc(`navMap navPoint content[src="${xhtmlFile}"]`);
    // get parent navMap of navpointContentTag
    const xhtmlFileNavMapTag = navpointContentTag.parent();
    const allNavPoints: NavPoint[] = getAllNavPoints($toc, xhtmlFileNavMapTag);
    let navPointChildXhtmlFiles: Array<string> = [];
    allNavPoints.filter((navPoint) => navPoint.src?.indexOf('#') === -1).forEach((navPoint) => navPointChildXhtmlFiles.push((navPoint.src ? navPoint.src : '')));
    // map navPointChildXhtmlFiles to content.opf manifest item href
    let idrefChildren: Array<string> = navPointChildXhtmlFiles.map((xhtmlFile) => $innerContent(`item[media-type="application/xhtml+xml"][href="${xhtmlFile}"]`)[0]?.attribs?.id);
    let idrefAll: Array<string> = [idref, ...idrefChildren];
    let xhtmlFileAll: Array<string> = [xhtmlFile, ...navPointChildXhtmlFiles];

    // remove $innerContent itemref[idref] other than idrefAll
    $innerContent('itemref').each((i: any, item: any) => {
      const idref = item?.attribs?.idref;
      if (idref && idrefAll.indexOf(idref) === -1) {
        $innerContent(item).remove();
      }
    });

    // remove $innerContent item[id] other than idrefAll with media-type="application/xhtml+xml"
    $innerContent('item[media-type="application/xhtml+xml"]').each((i: any, item: any) => {
      const id = item?.attribs?.id;
      if (id && idrefAll.indexOf(id) === -1) {
        $innerContent(item).remove();
      }
    });

    fs.writeFileSync(path.join(publicPath, `temp/${idref}/OPS/content.opf`), $innerContent.html());

    // Editing toc.ncx (table of contents)
    const $innerToc = cheerio.load(tocFileData, {xml: true});
    const navpointContent = $innerToc(`content[src="${xhtmlFile}"]`);
    if (navpointContent.length === 0) {
      console.log(`Unexpected navpoint format for ${idref} chapter.`);
      return;
    }
    const html = $innerToc.html(navpointContent[0].parent); // Getting chapter navpoint
    $innerToc('navPoint').remove(); // Removing all navpoints
    $innerToc(html).appendTo('navMap');
    fs.writeFileSync(path.join(publicPath, `temp/${idref}/OPS/toc.ncx`), $innerToc.html());

    // get first text from html
    const firstText = cheerio.load(html, {xml: true})('text').first().html();

    // Delete unused xhtml files and images
    const allFiles: Array<FileType> = Object.assign(new Array<FileType>(), walk(path.join(publicPath, `temp/${idref}/OPS`)));
    // const chapterXhtml = fs.readFileSync(path.join(publicPath, `temp/${idref}/OPS/${xhtmlFile}`), 'utf-8');
    const chaptersXhtml = xhtmlFileAll.map(xhtmlFile => fs.readFileSync(path.join(publicPath, `temp/${idref}/OPS/${xhtmlFile}`), 'utf-8')).join(' ');
    const removedFiles: Array<FileType> = [];
    for (const file of allFiles) {

      if (file.filename.indexOf('.xhtml') !== -1 && xhtmlFileAll.indexOf(file.filename) === -1) {
        fs.unlinkSync(file.path);
        removedFiles.push(file);
      }

      // make isMedia const for if statement by checking file.filename.indexOf for following file extensions: .jpg .jpeg .png .gif .svg  .mp3 .ogg .mp4 .webm
      const isMedia = file.filename.indexOf('.jpg') !== -1 || file.filename.indexOf('.jpeg') !== -1 || file.filename.indexOf('.png') !== -1 || file.filename.indexOf('.gif') !== -1 || file.filename.indexOf('.svg') !== -1 || file.filename.indexOf('.mp3') !== -1 || file.filename.indexOf('.ogg') !== -1 || file.filename.indexOf('.mp4') !== -1 || file.filename.indexOf('.webm') !== -1;
      if (isMedia && chaptersXhtml.indexOf(file.filename) === -1) {
        fs.unlinkSync(file.path);
        removedFiles.push(file);
      }
    }

    // Repackaging
    const zip2 = new admzip();
    zip2.addLocalFile(path.join(publicPath, `temp/${idref}/mimetype`));
    zip2.addLocalFolder(path.join(publicPath, `temp/${idref}/META-INF`), 'META-INF');
    zip2.addLocalFolder(path.join(publicPath, `temp/${idref}/OPS`), 'OPS');

    // read OPS/content.opf file and get html
    const contentOpf = zip2.getEntries().find((e: any) => e.entryName === 'OPS/content.opf');
    // remove <item> tags cotained in <manifest> from contentOpf with respect to href attribute
    const contentOpfHtml = contentOpf?.getData().toString('utf8');
    const $contentOpf = cheerio.load(contentOpfHtml, {xml: true});

    $contentOpf('manifest item').each((i: any, item: any) => {
      const href = item?.attribs?.href;
      if (href && removedFiles.find((f) => href.indexOf(f.filename) !== -1)) {
        $contentOpf(item).remove();
      }
    });

    // update contentOpf with new html
    zip2.updateFile('OPS/content.opf', Buffer.from($contentOpf.html(), 'utf8'));

    const ceeMediaRecord = await ceeMediaRepository.create({
      title: firstText,
      description: firstText,
      type: 'epub',
      resource: 'pending',
      parentId: parentCeeMediaId,
      identifierType: 'ISBN',
      identifier: isbn
    });
    const epubFile = idref + '-' + ceeMediaRecord.id + '.epub';
    await ceeMediaRepository.updateById(ceeMediaRecord.id, {resource: epubFile});
    zip2.writeZip(path.join(publicPath, `c2e-media-storage/${epubFile}`));
  });

  // Cleanup
  fs.rmSync(path.join(publicPath, 'temp'), {recursive: true, maxRetries: 10});
  return true;
};


function getAllNavPoints($: cheerioLib.CheerioAPI, element: any): NavPoint[] {
  const navPoints: NavPoint[] = [];

  $(element).find('navPoint').each(function () {
    const navPoint = $(this);
    const navLabel = navPoint.find('navLabel text:eq(0)').text();
    const contentSrc = navPoint.find('content:eq(0)').attr('src');

    const currentNavPoint: NavPoint = {
      label: navLabel,
    };

    if (contentSrc) {
      currentNavPoint.src = contentSrc;
    }

    getAllNavPoints($, navPoint);
    navPoints.push(currentNavPoint);
  });

  return navPoints;
}

export const createEpubCeeMedia = async (epubPath: string, ceeMediaRepository: CeeMediaRepository, resource: string, isbn: string): Promise<CeeMedia> => {
  const admZip = new AdmZip(epubPath);
  var epubEntries = admZip.getEntries(); // an array of ZipEntry records
  // read OPS/content.opf file and get html
  const contentOpf = epubEntries.find((e) => e.entryName === 'OPS/content.opf');
  const contentOpfHtml = contentOpf?.getData().toString('utf8');
  const cheerio = require('cheerio');
  // load html from contentOpfHtml using cheerio
  const contentOpfHtmlParsed = cheerio.load(contentOpfHtml, {xml: true});
  // get text from dc:title tag from contentOpfHtmlParsed
  const title = contentOpfHtmlParsed('dc\\:title').text();
  return await ceeMediaRepository.create({
    title,
    description: title,
    type: 'epub',
    resource,
    identifierType: 'ISBN',
    identifier: isbn
  });
}
