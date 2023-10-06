const { degrees, PDFDocument, rgb, StandardFonts } = PDFLib

async function getSignedURL(urn, derivativeurn) {
  let res = await fetch(`/api/models/signeds3download?urn=${urn}&derivativeUrn=${derivativeurn}`);
  let restext = await res.text();
  return restext;
}

async function modifyPdf() {
  let bucketKey = atob(NOP_VIEWER.model.getSeedUrn()).split('/')[0].split(':')[3];
  let objectName = atob(NOP_VIEWER.model.getSeedUrn()).split('/')[1];
  let modelURN = NOP_VIEWER.model.getSeedUrn();
  let pdfURN = NOP_VIEWER.model.getDocumentNode().children.find(n => n.data.role === 'pdf-page').data.urn;

   let signedURL = await getSignedURL(modelURN, pdfURN);
  // Fetch an existing PDF document
  const existingPdfBytes = await fetch(signedURL).then(res => res.arrayBuffer())

  // Load a PDFDocument from the existing PDF bytes
  const pdfDoc = await PDFDocument.load(existingPdfBytes)

  // Embed the Helvetica font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Get the first page of the document
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]

  // Get the width and height of the first page
  const { width, height } = firstPage.getSize()

  //Snippet to retrieve the texts
  //viewer.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[1]

  let text = NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].children[0].innerHTML;
  let text_x = parseFloat(NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].innerHTML.split('"')[1]);
  let text_y = parseFloat(NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].innerHTML.split('"')[3]);

  // Draw a string of text diagonally across the first page
  firstPage.drawText(text, {
    x: text_x,
    y: text_y,
    size: 50,
    font: helveticaFont,
    color: rgb(0.95, 0.1, 0.1),
    rotate: degrees(0),
  })

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save()

  // Trigger the browser to download the PDF document
  download(pdfBytes, "pdf-lib_modification_example.pdf", "application/pdf");
}