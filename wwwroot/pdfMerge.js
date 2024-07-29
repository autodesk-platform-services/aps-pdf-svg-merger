const { degrees, PDFDocument, rgb, StandardFonts } = PDFLib
var globalViewer;

async function getBase64StringPDF(urn, derivativeurn) {
  let res = await fetch(`/api/models/signeds3download?urn=${urn}&derivativeUrn=${derivativeurn}`);
  let restext = await res.text();
  return restext;
}

async function attachTextsNLinesToPDF(){
  let modelURN = globalViewer.model.getSeedUrn();
  let pdfURN = globalViewer.model.getDocumentNode().children.find(n => n.data.role === 'pdf-page').data.urn;

  //Get the signedURL to download the PDF document
  const base64PDFString = await getBase64StringPDF(modelURN, pdfURN);

  // Load a PDFDocument from the existing PDF bytes
  const pdfDoc = await PDFDocument.load(base64PDFString)

  // Embed the Helvetica font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Get the first page of the document
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const markupsCoreExtension = globalViewer.getExtension('Autodesk.Viewing.MarkupsCore');
  for(const textHTML of markupsCoreExtension.svg.getElementsByTagName('text')){
    try{
      for(const textLine of textHTML.children){
        addTextToPDFPage(textHTML, textLine, firstPage, helveticaFont);
      }
    }
    catch(err){
      console.log(`Error trying to add text ${textHTML}`, err)
    }
  }

  let linesExtension = globalViewer.getExtension('LinesToolExtension');
  for(const line of linesExtension.tool.lines){
    addLineToPDFPage(firstPage, line, linesExtension);
  }

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Trigger the browser to download the PDF document
  download(pdfBytes, "pdf-lib_modification_example.pdf", "application/pdf");
}

function addLineToPDFPage(pdfPage, line, linesExtension){
  // Get the width and height of the first page
  const { width, height } = pdfPage.getSize();

  //Viewer max coordinates
  let modelMaxX = globalViewer.model.getData().modelSpaceBBox.max.x;
  let modelMaxY = globalViewer.model.getData().modelSpaceBBox.max.y;

  //Position in Viewer coordinates
  let firstPoint = line.firstPoint.point;
  let secondPoint = line.secondPoint.point;
  //ratio PDF-LIB/Viewer units
  let ratioWidth = width / modelMaxX;
  let ratioHeight = height / modelMaxY;
  let relativeFirstPoint = getRelativePoint(firstPoint, ratioWidth);
  let relativeSecondPoint = getRelativePoint(secondPoint, ratioHeight);
  //Positioning of text in the sheet in PDF-LIB coordinates
  const firstPointX = -(0.5*width) + relativeFirstPoint.x;
  const firstpointY = -(0.5*height) + relativeFirstPoint.y;
  const secondPointX = -(0.5*width) + relativeSecondPoint.x;
  const secondPointY = -(0.5*height) + relativeSecondPoint.y;

  let lineColor = linesExtension.tool.lineMaterial.color;

  pdfPage.drawLine({
    start: { x: firstPointX, y: firstpointY },
    end: { x: secondPointX, y: secondPointY },
    thickness: linesExtension.tool.lineThickness * ratioWidth,
    color: rgb(lineColor.r, lineColor.g, lineColor.b),
    opacity: 0.75,
  })
}

function getRelativePoint(point, ratio){
  return new THREE.Vector3(
    point.x * ratio,
    point.y * ratio,
    point.z * ratio,
  )
}

function addTextToPDFPage(textHTML, textLine, pdfPage, font){
  // Get the width and height of the first page
  const { width, height } = pdfPage.getSize();

  //Offsets from the rectangle to the actual text added with Markupd extension
  let textOffsetX = parseFloat(textLine.getAttribute('x'));
  let textOffsetY = parseFloat(textLine.getAttribute('y'));

  let fontSize = parseFloat(textHTML.getAttribute('font-size'));
  //example: 'rgba(255,0,0,1)'
  let rgba = textHTML.getAttribute('fill');
  let red = parseFloat(rgba.split('(')[1].split(',')[0])/255;
  let green = parseFloat(rgba.split('(')[1].split(',')[1])/255;
  let blue = parseFloat(rgba.split('(')[1].split(',')[2])/255;
  //example: 'translate( 6.841478996503916 , 18.88096329583941 ) rotate( 0 ) scale(0.01,-0.01)'
  let transform = textHTML.getAttribute('transform');
  //Scale applied by Markups extension
  let scale = parseFloat(transform.split('scale(')[1].split(',')[0]);
  //Rotation applied by Markups extension
  let rotation = parseFloat(transform.split('rotate')[1].split('(')[1].split(')')[0]);
  //Position in Viewer coordinates
  let translateX = parseFloat(transform.split('(')[1].split(',')[0]);
  let translatey = parseFloat(transform.split('(')[1].split(',')[1].split(')')[0]);
  //Viewer max coordinates
  let modelMaxX = globalViewer.model.getData().modelSpaceBBox.max.x;
  let modelMaxY = globalViewer.model.getData().modelSpaceBBox.max.y;
  //Relative positioning of text in the sheet varying from 0 to 1
  let relativeX = (translateX+(textOffsetX*scale))/modelMaxX;
  let relativeY = (translatey-(textOffsetY*scale))/modelMaxY;
  //ratio PDF-LIB/Viewer units
  let ratio = width/modelMaxX;
  //Positioning of text in the sheet in PDF-LIB coordinates
  const finalX = -(0.5*width) + (width*relativeX);
  const finalY = -(0.5*height) + (height*relativeY);

  // Draw a string of text across the first page
  pdfPage.drawText(textLine.innerHTML, {
    x: finalX,
    y: finalY,
    size: fontSize*ratio*scale,
    font: font,
    color: rgb(red, green, blue),
    rotate: degrees(rotation),
  });
}
