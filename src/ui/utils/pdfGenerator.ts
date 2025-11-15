import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface BillData {
  saleId?: number | string
  customerId?: string
  customerPhone: string
  items: Array<{
    product_name: string
    company_name: string
    quantity: number
    mrp: number
    salePrice: number
    total: number
    selectedBatch?: any
  }>
  grandTotal: number
  grandDiscountTotal: number
  netPrice: number
  saleDate?: string
}

/**
 * Generate and download a professional PDF bill
 * @param billData - The sale and items data
 * @param pharmName - Pharmacy name for the bill header
 */
export const generateAndDownloadPDF = async (
  billData: BillData,
  pharmName: string = 'Pharmacy POS'
) => {
  try {
    // Create a temporary container for the bill HTML
    const billContainer = document.createElement('div')
    billContainer.innerHTML = generateBillHTML(billData, pharmName)
    billContainer.style.position = 'absolute'
    billContainer.style.left = '-9999px'
    billContainer.style.width = '210mm' // A4 width
    billContainer.style.padding = '10mm'
    billContainer.style.backgroundColor = 'white'
    billContainer.style.fontFamily = 'Arial, sans-serif'

    document.body.appendChild(billContainer)

    // Convert HTML to canvas
    const canvas = await html2canvas(billContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowHeight: billContainer.scrollHeight,
      windowWidth: billContainer.scrollWidth,
    })

    // Remove temporary container
    document.body.removeChild(billContainer)

    // Create PDF from canvas
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth - 10 // 5mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 5 // 5mm top margin

    // Add image to PDF (handling multiple pages if needed)
    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight - 10

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    // Download the PDF
    const fileName = `Bill_${billData.saleId}_${new Date().getTime()}.pdf`
    pdf.save(fileName)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF bill')
  }
}

/**
 * Generate the HTML structure for the bill
 */
const generateBillHTML = (billData: BillData, pharmName: string): string => {
  const saleDate = billData.saleDate || new Date().toLocaleString('en-BD')
  const itemRows = billData.items
    .map(
      (item, idx) => `
    <tr style="border-bottom: 1px solid #ddd; height: 25px;">
      <td style="padding: 5px; text-align: center; font-size: 12px;">${idx + 1}</td>
      <td style="padding: 5px; font-size: 12px;">
        <strong>${item.product_name}</strong><br/>
        <small>${item.company_name}</small>
        ${
          item.selectedBatch
            ? `<br/><small style="color: #666;">Batch: ${item.selectedBatch.batch_no}</small>`
            : ''
        }
      </td>
      <td style="padding: 5px; text-align: center; font-size: 12px;">${item.quantity}</td>
      <td style="padding: 5px; text-align: right; font-size: 12px;">৳${item.mrp.toFixed(2)}</td>
      <td style="padding: 5px; text-align: right; font-size: 12px;">৳${item.salePrice.toFixed(
        2
      )}</td>
      <td style="padding: 5px; text-align: right; font-size: 12px; font-weight: bold;">৳${item.total.toFixed(
        2
      )}</td>
    </tr>
  `
    )
    .join('')

  return `
    <div style="max-width: 80mm; margin: 0 auto; padding: 10px; font-family: Arial, sans-serif; font-size: 13px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${pharmName}</h2>
        <p style="margin: 3px 0; font-size: 11px; color: #555;">PHARMACY RECEIPT</p>
        <p style="margin: 3px 0; font-size: 10px; color: #666;">Generated: ${saleDate}</p>
      </div>

      <!-- Bill Info -->
      <div style="margin-bottom: 12px; font-size: 11px; line-height: 1.6;">
        <p style="margin: 2px 0;"><strong>Bill ID:</strong> ${billData.saleId}</p>
        <p style="margin: 2px 0;"><strong>Customer:</strong> ${billData.customerPhone}</p>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; margin-bottom: 12px; font-size: 11px; border-collapse: collapse;">
        <thead>
          <tr style="border-top: 1px solid #000; border-bottom: 2px solid #000; background-color: #f5f5f5;">
            <th style="padding: 5px; text-align: center; font-size: 11px; font-weight: bold; width: 5%;">S.No</th>
            <th style="padding: 5px; text-align: left; font-size: 11px; font-weight: bold;">Product</th>
            <th style="padding: 5px; text-align: center; font-size: 11px; font-weight: bold; width: 10%;">Qty</th>
            <th style="padding: 5px; text-align: right; font-size: 11px; font-weight: bold; width: 12%;">MRP</th>
            <th style="padding: 5px; text-align: right; font-size: 11px; font-weight: bold; width: 12%;">Rate</th>
            <th style="padding: 5px; text-align: right; font-size: 11px; font-weight: bold; width: 15%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- Summary -->
      <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 0; margin-bottom: 12px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Gross Total:</span>
          <strong>৳${billData.grandTotal.toFixed(2)}</strong>
        </div>
        ${
          billData.grandDiscountTotal > 0
            ? `
          <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #d9534f;">
            <span>Discount:</span>
            <strong>-৳${billData.grandDiscountTotal.toFixed(2)}</strong>
          </div>
        `
            : ''
        }
        <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; font-weight: bold; color: #27ae60;">
          <span>Net Amount:</span>
          <span>৳${billData.netPrice.toFixed(2)}</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #666; line-height: 1.5;">
        <p style="margin: 5px 0;">Thank you for your purchase!</p>
        <p style="margin: 5px 0;">Please keep this receipt for your records</p>
        <p style="margin: 5px 0; font-weight: bold;">For support contact: ${pharmName}</p>
        <p style="margin: 5px 0; font-size: 9px;">Generated by Pharmacy POS System</p>
      </div>
    </div>
  `
}
