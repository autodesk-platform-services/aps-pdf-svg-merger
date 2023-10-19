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

  //example: 'somestring'
  let text = NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].children[0].innerHTML;
  //example: 32.850948
  let text_x = parseFloat(NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].innerHTML.split('"')[1]);
  //example: 15.982348
  let text_y = parseFloat(NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].innerHTML.split('"')[3]);
  //example: '31.813357819461174'
  let fontSize = parseFloat(NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].getAttribute('font-size'));
  //example: 'rgba(255,0,0,1)'
  let rgba = NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].getAttribute('fill');
  let red = parseFloat(rgba.split('(')[1].split(',')[0])/255;
  let green = parseFloat(rgba.split('(')[1].split(',')[1])/255;
  let blue = parseFloat(rgba.split('(')[1].split(',')[2])/255;
  //example: 'translate( 6.841478996503916 , 18.88096329583941 ) rotate( 0 ) scale(0.01,-0.01)'
  let transform = NOP_VIEWER.getExtension('Autodesk.Viewing.MarkupsCore').svg.getElementsByTagName('text')[0].getAttribute('transform');
  let rotation = parseFloat(transform.split('rotate')[1].split('(')[1].split(')')[0]);
  let translateX = parseFloat(transform.split('(')[1].split(',')[0]);
  let translatey = parseFloat(transform.split('(')[1].split(',')[1].split(')')[0]);
  let modelMaxX = NOP_VIEWER.model.getData().modelSpaceBBox.max.x;
  let modelMaxY = NOP_VIEWER.model.getData().modelSpaceBBox.max.y;
  let relativeX = translateX/modelMaxX;
  let relativeY = translatey/modelMaxY;

  const finalX = -(0.5*width) + (width*relativeX);
  const finalY = -(0.5*height) + (height*relativeY);

  // Draw a string of text diagonally across the first page
  firstPage.drawText(text, {
    x: finalX,
    y: finalY,
    size: fontSize,
    font: helveticaFont,
    color: rgb(red, green, blue),
    rotate: degrees(rotation),
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save()

  // Trigger the browser to download the PDF document
  download(pdfBytes, "pdf-lib_modification_example.pdf", "application/pdf");
}