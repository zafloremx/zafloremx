
'use strict';

window.XLSXCatalog = (() => {
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function columnIndex(reference) {
    const letters = String(reference).match(/[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
    let value = 0;
    for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
    return value - 1;
  }

  async function read(arrayBuffer) {
    if (!window.JSZip) throw new Error('No se cargó el lector de archivos Excel.');
    const zip = await JSZip.loadAsync(arrayBuffer);

    const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!workbookXml || !relsXml) throw new Error('El archivo no contiene un libro de Excel válido.');

    const parser = new DOMParser();
    const workbookDoc = parser.parseFromString(workbookXml, 'application/xml');
    const relsDoc = parser.parseFromString(relsXml, 'application/xml');
    const firstSheet = workbookDoc.getElementsByTagNameNS('*', 'sheet')[0];
    if (!firstSheet) throw new Error('El libro no contiene hojas.');

    const relationId = firstSheet.getAttributeNS(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'id'
    ) || firstSheet.getAttribute('r:id');

    const relation = [...relsDoc.getElementsByTagNameNS('*', 'Relationship')]
      .find(item => item.getAttribute('Id') === relationId);
    if (!relation) throw new Error('No fue posible localizar la primera hoja.');

    let target = relation.getAttribute('Target') || 'worksheets/sheet1.xml';
    target = target.replace(/^\/?xl\//, '');
    const sheetPath = `xl/${target.replace(/^\//, '')}`;

    const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
    const shared = [];
    if (sharedXml) {
      const sharedDoc = parser.parseFromString(sharedXml, 'application/xml');
      for (const item of sharedDoc.getElementsByTagNameNS('*', 'si')) {
        shared.push([...item.getElementsByTagNameNS('*', 't')].map(t => t.textContent || '').join(''));
      }
    }

    const sheetXml = await zip.file(sheetPath)?.async('string');
    if (!sheetXml) throw new Error('No fue posible leer la primera hoja.');
    const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
    const output = [];

    for (const row of sheetDoc.getElementsByTagNameNS('*', 'row')) {
      const values = [];
      for (const cell of row.getElementsByTagNameNS('*', 'c')) {
        const index = columnIndex(cell.getAttribute('r'));
        const type = cell.getAttribute('t');
        let value = '';

        if (type === 'inlineStr') {
          value = [...cell.getElementsByTagNameNS('*', 't')].map(t => t.textContent || '').join('');
        } else {
          const raw = cell.getElementsByTagNameNS('*', 'v')[0]?.textContent ?? '';
          value = type === 's' ? (shared[Number(raw)] ?? '') : raw;
          if (type !== 's' && type !== 'str' && raw !== '' && Number.isFinite(Number(raw))) {
            value = Number(raw);
          }
        }
        values[index] = value;
      }
      output.push(values);
    }

    return output;
  }

  async function write(rows, sheetName = 'Retroalimentacion') {
    if (!window.JSZip) throw new Error('No se cargó el generador de archivos Excel.');
    const zip = new JSZip();

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${ns}">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFD8B85A"/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF111111"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`;

    function colName(index) {
      let name = '';
      let value = index + 1;
      while (value) {
        value--;
        name = String.fromCharCode(65 + (value % 26)) + name;
        value = Math.floor(value / 26);
      }
      return name;
    }

    const rowXml = rows.map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => {
        if (value === null || value === undefined || value === '') return '';
        const ref = `${colName(colIndex)}${rowIndex + 1}`;
        const style = rowIndex === 0 ? ' s="1"' : '';
        if (typeof value === 'number' && Number.isFinite(value)) {
          return `<c r="${ref}"${style}><v>${value}</v></c>`;
        }
        return `<c r="${ref}" t="inlineStr"${style}><is><t>${xmlEscape(value)}</t></is></c>`;
      }).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');

    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${ns}">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetData>${rowXml}</sheetData>
</worksheet>`;

    zip.file('[Content_Types].xml', contentTypes);
    zip.folder('_rels').file('.rels', rels);
    zip.folder('xl').file('workbook.xml', workbook);
    zip.folder('xl').file('styles.xml', styles);
    zip.folder('xl').folder('_rels').file('workbook.xml.rels', workbookRels);
    zip.folder('xl').folder('worksheets').file('sheet1.xml', sheet);

    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      compression: 'DEFLATE'
    });
  }

  return Object.freeze({ read, write });
})();
