const { degrees, PDFDocument, rgb, StandardFonts } = PDFLib

async function getSignedURL(urn, derivativeurn) {
  const options = {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + _access_token
    },
    credentials: 'include'
  };
  let res = await fetch(`https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest/${derivativeurn}/signedcookies`, options);
  let resjson = await res.json();
  return resjson.url;
}

async function modifyPdf() {
  let bucketKey = atob(viewer.model.getSeedUrn()).split('/')[0].split(':')[3];
  let objectName = atob(viewer.model.getSeedUrn()).split('/')[1];
  let modelURN = viewer.model.getSeedUrn();
  let pdfURN = viewer.model.getDocumentNode().children.find(n => n.data.role === 'pdf-page').data.urn;

   let signedURL = await getSignedURL(modelURN, pdfURN);
  // Fetch an existing PDF document
  const existingPdfBytes = await fetch('').then(res => res.arrayBuffer())

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

  // Draw a string of text diagonally across the first page
  firstPage.drawText('This text was added with JavaScript!', {
    x: 5,
    y: height / 2 + 300,
    size: 50,
    font: helveticaFont,
    color: rgb(0.95, 0.1, 0.1),
    rotate: degrees(-45),
  })

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save()

  // Trigger the browser to download the PDF document
  download(pdfBytes, "pdf-lib_modification_example.pdf", "application/pdf");
}