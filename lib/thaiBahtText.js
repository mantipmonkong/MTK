export function ThaiBahtText(number) {
    if (isNaN(number) || number === null) return '-';
    
    // Convert to string and handle decimals safely
    const numString = Number(number).toFixed(2);
    const parts = numString.split('.');
    
    const integers = parts[0];
    const decimals = parts[1] || '00';
    
    const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    
    const convertToText = (numStr) => {
        if (numStr === '0' || numStr === '00') return '';
        
        let text = '';
        const length = numStr.length;
        
        for (let i = 0; i < length; i++) {
            const digit = parseInt(numStr.charAt(i));
            const pos = length - 1 - i; // Position from right (0-indexed)
            
            if (digit === 0) continue;
            
            // Handle rules
            if (pos === 0 && digit === 1 && length > 1 && numStr.charAt(i-1) !== '0') {
                text += 'เอ็ด';
            } else if (pos === 1 && digit === 1) {
                text += 'สิบ';
            } else if (pos === 1 && digit === 2) {
                text += 'ยี่สิบ';
            } else {
                text += THAI_NUMBERS[digit] + THAI_UNITS[pos % 6];
            }
            
            // Add 'ล้าน' for every 6 positions
            if (pos > 0 && pos % 6 === 0) {
                text += 'ล้าน';
            }
        }
        return text;
    };
    
    const integerText = convertToText(integers);
    const decimalText = convertToText(decimals);
    
    if (integerText === '' && decimalText === '') return 'ศูนย์บาทถ้วน';
    if (integerText === '') return decimalText + 'สตางค์';
    if (decimalText === '') return integerText + 'บาทถ้วน';
    
    return integerText + 'บาท' + decimalText + 'สตางค์';
}
