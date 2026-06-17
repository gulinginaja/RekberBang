/**
 * OCR Service Integration
 * 
 * In a production environment, this would integrate with Google Cloud Vision, 
 * Tesseract, or OpenAI Vision. For now, it provides a structured interface 
 * and simulated extraction for privacy-first evidence retention.
 */

export interface OCRExtractionResult {
  nominal: number | null;
  sender_name: string | null;
  sender_account: string | null;
  recipient_name: string | null;
  recipient_account: string | null;
  bank_name: string | null;
  transfer_date: string | null;
  transfer_time: string | null;
  verification_status: 'PENDING' | 'AUTO_VERIFIED' | 'MANUAL_REVIEW_NEEDED';
}

export async function extractTransactionData(imageBuffer: ArrayBuffer | Buffer): Promise<OCRExtractionResult> {
  // Simulate network delay for OCR processing
  await new Promise(resolve => setTimeout(resolve, 800));

  // In a real app, send imageBuffer to OCR API here.
  
  // Simulated OCR Result
  return {
    nominal: 1500000,
    sender_name: "JOHN DOE",
    sender_account: "1234567890",
    recipient_name: "REKBER BANG OFFICIAL",
    recipient_account: "0987654321",
    bank_name: "BCA",
    transfer_date: new Date().toISOString().split('T')[0],
    transfer_time: new Date().toTimeString().split(' ')[0].slice(0, 5), // HH:MM
    verification_status: 'AUTO_VERIFIED'
  };
}
