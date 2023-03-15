import fs from 'fs/promises';
import qrcode from 'qrcode';
import { PassThrough } from 'stream';
import { formatDate, roundUptoTwoDecimals } from './basic.utils';
import { Response } from 'express';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PaymentMethod } from '../interfaces';

export const exportPDF = (bytes: any, filename: string, response: Response) => {
  response.set('Content-disposition', 'attachment; filename=' + formatDate() + `_${filename}.pdf`);
  response.set('Content-Type', 'application/pdf');
  const readStream = new PassThrough();
  readStream.pipe(response);
  readStream.end(bytes);
}

export const generateTicketAndSendEmail = async (transaction: any) => {
  const pdfBytes = await fs.readFile('assets/pdf/ticket-template.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // set metadata
  pdfDoc.setTitle('Curling Kaartje');
  pdfDoc.setSubject('Curling Baan Kaartje');
  pdfDoc.setAuthor('Techoices');
  pdfDoc.setCreator('Techoices');
  pdfDoc.setLanguage('nl-NL');
  pdfDoc.setCreationDate(new Date());

  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { height } = page.getSize();

  // load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // text sizes
  const headingTextSize = 11;
  const regularTextSize = 8;

  // qr box
  page.drawRectangle({
    x: 300,
    y: height - 775,
    width: 250,
    height: 165,
    color: rgb(1, 1, 1),
    borderWidth: 1.5,
  });

  // ticket title
  let y = height - 630;
  page.drawText('Curling ticket', {
    x: 385,
    y,
    size: headingTextSize,
    font: helveticaBoldFont,
  });

  // order ID
  y -= 48;
  page.drawText('Bestelnummer:', {
    x: 310,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(String(transaction._id).slice(16), {
    x: 372,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });

  // Code
  y -=20;
  page.drawText('Code:', {
    x: 310,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(transaction.code, {
    x: 335,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });

  // Customer Name
  y -=20;
  page.drawText('Klantnaam:', {
    x: 310,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(formatText(transaction.customerDetails.name, 16), {
    x: 357,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });

  // Purchase Date
  y -=20;
  page.drawText('Datum:', {
    x: 310,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(formatDate(), {
    x: 340,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  
  // qr image
  const qrImageBuffer = await qrcode.toBuffer(transaction.code, {
    margin: 2,
    scale: 5,
    errorCorrectionLevel: 'Q'
  });
  const qrImage = await pdfDoc.embedPng(qrImageBuffer);
  const qrImageDims = qrImage.scale(0.9)
  page.drawImage(qrImage, {
    x: 430,
    y: height - 760,
    ...qrImageDims
  });

  // hide samnax copyright
  page.drawRectangle({
    x: 35,
    y: height - 828,
    width: 70,
    height: 30,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });

  // show fitoutfit copyright
  page.drawText('Powered by TeChoices', {
    x: 35,
    y: height - 815,
    size: 7,
    font: helveticaFont,
  });

  const bytes = await pdfDoc.save();
  fs.writeFile('./test.pdf', bytes);
}

export const generateUserOrdersStatsPDFReport = async (salesMeta: any, userSalesStats: any, response: any) => {
  const pdfDoc = await PDFDocument.create();

  // set metadata
  pdfDoc.setTitle('Kassa Report');
  pdfDoc.setSubject('Plan Inburgering en Participatie (PIP)');
  pdfDoc.setAuthor('Techoices');
  pdfDoc.setCreator('Techoices');
  pdfDoc.setLanguage('nl-NL');
  pdfDoc.setCreationDate(new Date());

  // load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // load logo image
  const logoName = process.env.APP_NAME === 'trichter' ? 'trichter-logo.png' : 'winterland-logo.png';
  const logoWidth = process.env.APP_NAME === 'trichter' ? 60 : 50;
  const logoHeight = process.env.APP_NAME === 'trichter' ? 40 : 50;
  const logoImageBuffer = await fs.readFile(`assets/logos/${logoName}`);
  const logoImage = await pdfDoc.embedPng(logoImageBuffer);

  // text sizes
  const headingTextSize = 12;
  const boldTextSize = 10;
  const regularTextSize = 9;
  
  let page = pdfDoc.addPage();
  let y = page.getHeight() - 60;

  page.drawImage(logoImage, {
    x: 65,
    y,
    width: logoWidth,
    height: logoHeight
  });

  if (process.env.APP_NAME === 'trichter') {
    page.drawText('Trichter BV,', {
      x: 370,
      y: y + 30,
      size: regularTextSize,
      font: helveticaFont,
    });
    page.drawText('Sint Annalaan 60, Postcode:6217 KC,', {
      x: 370,
      y: y + 20,
      size: regularTextSize,
      font: helveticaFont,
    });
    page.drawText('Maastricht, BTW nr: NL863019675BO1', {
      x: 370,
      y: y + 10,
      size: regularTextSize,
      font: helveticaFont,
    });
  }
  else {
    page.drawText('Winterland Hasselt,', {
      x: 355,
      y: y + 30,
      size: regularTextSize,
      font: helveticaFont,
    });
    page.drawText('Hendrik Van Veldekessingel 150/44 - 3500,', {
      x: 355,
      y: y + 20,
      size: regularTextSize,
      font: helveticaFont,
    });
    page.drawText('Hasselt, BTW-nr. BE 0807.018.719', {
      x: 355,
      y: y + 10,
      size: regularTextSize,
      font: helveticaFont,
    });
  }

  // header line
  drawHorizontalLine(65, 528, y - 10, 1);

  y -= 35;
  page.drawText(formatHeading('Kassa - Controleformulier'), {
    x: 65,
    y,
    size: headingTextSize,
    font: helveticaBoldFont,
  });

  page.drawText(formatHeading(formatText(salesMeta.user?.name)), {
    x: 345,
    y,
    size: headingTextSize,
    font: helveticaBoldFont,
  });

  // Date
  y -= 30;
  page.drawText(formatHeading('Datum - Begin:'), {
    x: 65,
    y,
    size: boldTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(salesMeta.startDate, {
    x: 155,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  page.drawText(formatHeading('Datum - Einde:'), {
    x: 345,
    y,
    size: boldTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(salesMeta.endDate, {
    x: 435,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });

  const allowedPaymentMethods = [PaymentMethod.Cash, PaymentMethod.Pin];

  // Products Sales Data
  if (userSalesStats.productsSalesData.length) {

    // Products Sales Total
    y -= 40;
    addPageIfNeeded();
    page.drawText(formatHeading('Producten'), {
      x: 65,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    page.drawText(formatHeading('Prijs'), {
      x: 250,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    page.drawText(formatHeading('Verkocht'), {
      x: 360,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    page.drawText(formatHeading('Totaal'), {
      x: 470,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    y -= 15;
    userSalesStats.productsSalesData.forEach((productSaleData: any) => {
      addPageIfNeeded();
      page.drawText(formatText(productSaleData.product?.name, 40) || 'N/A', {
        x: 65,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      page.drawText(formatPrice(productSaleData.unitPrice), {
        x: 250,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      page.drawText('x', {
        x: 320,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      page.drawText(formatText(`${productSaleData.totalQuantity}`), {
        x: 360,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      page.drawText('=', {
        x: 430,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      page.drawText(formatPrice(productSaleData.totalPrice), {
        x: 470,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      y -= 15;
    });

    // Other Payment Methods Sales
    y -= 40;
    addPageIfNeeded();
    page.drawText(formatHeading('Andere betaalmethode'), {
      x: 65,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    page.drawText(formatHeading('Verkocht'), {
      x: 300,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    page.drawText(formatHeading('Verbruikt'), {
      x: 470,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    y -= 15;
    
    userSalesStats.paymentMethodsSalesData.forEach((paymentMethodSalesData: any) => {
      if (!(allowedPaymentMethods.includes(paymentMethodSalesData._id))) {
        addPageIfNeeded();
        page.drawText(formatText(paymentMethodSalesData._id), {
          x: 65,
          y,
          size: regularTextSize,
          font: helveticaFont,
        });
        page.drawText(formatText(paymentMethodSalesData.totalOrders), {
          x: 300,
          y,
          size: regularTextSize,
          font: helveticaFont,
        });
        page.drawText(formatText(`${(paymentMethodSalesData._id === PaymentMethod.Coupons) ? paymentMethodSalesData.totalCoupons
          : (paymentMethodSalesData._id === PaymentMethod.RFIDCard) ? paymentMethodSalesData.totalCredits 
          : 'N/A'}`), {
          x: 470,
          y,
          size: regularTextSize,
          font: helveticaFont,
        });
        y -= 15;
      }
    });
  }

  // RFID Sales Data
  if (userSalesStats.rfidSalesData.length) {
    y -= 40;
    addPageIfNeeded();
    page.drawText(formatHeading('RFID-product'), {
      x: 65,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    page.drawText(formatHeading('Verkocht'), {
      x: 300,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    page.drawText(formatHeading('Totaal'), {
      x: 470,
      y,
      size: regularTextSize,
      font: helveticaBoldFont,
    });
    y -= 15;

    userSalesStats.rfidSalesData.forEach((rfidSaleData: any) => {
      addPageIfNeeded();
      page.drawText(formatText(rfidSaleData.product), {
        x: 65,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      page.drawText(formatText(rfidSaleData.totalOrders), {
        x: 300,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      page.drawText(formatPrice(rfidSaleData.totalSalesAmount), {
        x: 470,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      y -= 15;
    });
  }

  // Cash & Pin Sales
  y -= 40;
  addPageIfNeeded();
  page.drawText(formatHeading('Cash/Pin Betalingswijze'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(formatHeading('Verzameld'), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  y -= 15;
  let totalSalesAmount = 0;
  userSalesStats.paymentMethodsSalesData.forEach((paymentMethodSalesData: any) => {
    if (allowedPaymentMethods.includes(paymentMethodSalesData._id)) {
      addPageIfNeeded();
      page.drawText(formatText(`Totale omzet ${paymentMethodSalesData._id}`, 50), {
        x: 65,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      page.drawText(formatPrice(paymentMethodSalesData.totalSalesAmount), {
        x: 470,
        y,
        size: regularTextSize,
        font: helveticaFont,
      });
      y -= 15;
      totalSalesAmount = roundUptoTwoDecimals(totalSalesAmount + paymentMethodSalesData.totalSalesAmount);
    }
  });
  drawHorizontalLine(65, 528, y + 5, 0.5);
  y -= 10;
  addPageIfNeeded();
  page.drawText(formatHeading('totale verkoop'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(formatPrice(totalSalesAmount), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });

  // Overall Stats
  y -=40;
  addPageIfNeeded();
  const cashSalesData = userSalesStats.paymentMethodsSalesData.find((paymentMethodSalesData: any) => paymentMethodSalesData._id === 'Cash');
  const cashSalesAmount = cashSalesData?.totalSalesAmount || 0;
  page.drawText(formatHeading('omzet contant geld'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  addPageIfNeeded();
  page.drawText(formatPrice(cashSalesAmount), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  y -= 15;
  addPageIfNeeded();
  page.drawText(formatHeading('start kassa papiergeld'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  addPageIfNeeded();
  page.drawText(formatPrice(salesMeta.cashGiven), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  y -= 15;
  addPageIfNeeded();
  page.drawText(formatHeading('start kassa munten'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  page.drawText(formatPrice(salesMeta.coinsGiven), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  y -= 15;
  addPageIfNeeded();
  drawHorizontalLine(65, 528, y + 5, 0.5);
  y -= 10;
  addPageIfNeeded();
  page.drawText(formatHeading('Totaal contant in kas'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  const totalCash = roundUptoTwoDecimals(cashSalesAmount + salesMeta.cashGiven + salesMeta.coinsGiven);
  page.drawText(formatPrice(totalCash), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  y -= 15;
  addPageIfNeeded();
  page.drawText(formatHeading('end kassa papiergeld'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  page.drawText(formatPrice(salesMeta.cashReceived), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  y -= 15;
  addPageIfNeeded();
  page.drawText(formatHeading('end kassa munten'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  page.drawText(formatPrice(salesMeta.coinsReceived), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaFont,
  });
  y -= 15;
  addPageIfNeeded();
  drawHorizontalLine(65, 528, y + 5, 0.5);
  y -= 10;
  addPageIfNeeded();
  page.drawText(formatHeading('Totaal verschil'), {
    x: 65,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });
  page.drawText(formatPrice(totalCash - salesMeta.cashReceived - salesMeta.coinsReceived), {
    x: 470,
    y,
    size: regularTextSize,
    font: helveticaBoldFont,
  });

  const bytes = await pdfDoc.save();
  // fs.writeFile('./test.pdf', bytes);
  exportPDF(bytes, `${salesMeta.user?.username}_cashier_report`, response);

  function addPageIfNeeded() {
    if (y <= 105) {
      page = pdfDoc.addPage();
      y = page.getHeight() - 80;
    }
  }

  function drawHorizontalLine(xStart: number, xEnd: number, yPos: number, thickness = 0.5) {
    page.drawLine({
      start: { x: xStart, y: yPos },
      end: { x: xEnd, y: yPos },
      thickness,
    });
  }

  function formatHeading(str: string) {
    return str.toUpperCase();
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(price).replace(/^(\D+)/, '$1 ');
  }
}

function formatText(str: string, maxLength = 26) {
  if (!str) return '';
  if (str.length > maxLength) return `${str.slice(0, maxLength)}...`;
  return `${str}`;
}