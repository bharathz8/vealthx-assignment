import staticList from '../config/staticList.json' with { type: "json" };
// Basic simulated document analysis using keywords
export const detectDocumentType = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('bank statement') ||
        lowerText.includes('account statement') ||
        lowerText.includes('transaction history') ||
        lowerText.includes('bank')) {
        return 'bank_statement';
    }
    else if (lowerText.includes('insurance policy') ||
        lowerText.includes('health insurance') ||
        lowerText.includes('term plan') ||
        lowerText.includes('life insurance')) {
        return 'insurance_policy';
    }
    else if (lowerText.includes('vehicle insurance') ||
        lowerText.includes('car insurance') ||
        lowerText.includes('motor insurance')) {
        return 'vehicle_policy';
    }
    return 'unknown';
};
// Extract data from bank statement
export const extractBankStatementData = (text) => {
    // Example implementation - in a real app, this would use more sophisticated NLP/regex
    const lowerText = text.toLowerCase();
    let name = '';
    let accountNumber = '';
    let balanceAmount = 0;
    // Extract bank name
    const bankNames = ['hdfc', 'icici', 'sbi', 'axis', 'kotak'];
    for (const bank of bankNames) {
        if (lowerText.includes(bank)) {
            name = bank.toUpperCase() + ' Bank';
            break;
        }
    }
    // Extract account number - simple pattern matching
    const accountMatch = text.match(/[Aa]ccount\s*(?:[Nn]o\.?|[Nn]umber)?\s*:?\s*(\d{4}[\s-]?\d{4}[\s-]?\d{4})/);
    if (accountMatch) {
        accountNumber = accountMatch[1].replace(/\s|-/g, '');
    }
    // Extract balance amount
    const balanceMatch = text.match(/[Bb]alance\s*:?\s*(?:Rs\.|Rs|INR|₹)?\s*([\d,]+\.?\d*)/);
    if (balanceMatch) {
        balanceAmount = parseFloat(balanceMatch[1].replace(/,/g, ''));
    }
    return {
        name,
        type: 'bank_account',
        accountNumber,
        balanceAmount,
        source: 'detected'
    };
};
// Extract data from insurance policy
export const extractInsuranceData = (text) => {
    const lowerText = text.toLowerCase();
    let name = '';
    let policyNumber = '';
    let insuredAmount = 0;
    let renewalDate = undefined;
    // Extract insurer name
    const insurers = ['lic', 'star health', 'tata aig', 'hdfc ergo', 'max life'];
    for (const insurer of insurers) {
        if (lowerText.includes(insurer)) {
            name = insurer.toUpperCase() + ' Insurance';
            break;
        }
    }
    // Extract policy number
    const policyMatch = text.match(/[Pp]olicy\s*(?:[Nn]o\.?|[Nn]umber)?\s*:?\s*([A-Z0-9-]{5,20})/);
    if (policyMatch) {
        policyNumber = policyMatch[1];
    }
    // Extract insured amount
    const amountMatch = text.match(/[Ss]um\s*[Aa]ssured\s*:?\s*(?:Rs\.|Rs|INR|₹)?\s*([\d,]+\.?\d*)/);
    if (amountMatch) {
        insuredAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }
    // Extract renewal date
    const dateMatch = text.match(/[Rr]enewal\s*[Dd]ate\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
    if (dateMatch) {
        renewalDate = new Date(dateMatch[1].replace(/-/g, '/'));
    }
    return {
        name,
        type: 'insurance',
        policyNumber,
        insuredAmount,
        renewalDate,
        source: 'detected'
    };
};
// Extract data from vehicle policy
export const extractVehicleData = (text) => {
    // Similar implementation to insurance extraction but tailored for vehicle policies
    const lowerText = text.toLowerCase();
    let name = '';
    let policyNumber = '';
    let insuredAmount = 0;
    let renewalDate = undefined;
    // Extract insurer name
    const insurers = ['tata aig', 'hdfc ergo', 'icici lombard', 'bajaj allianz'];
    for (const insurer of insurers) {
        if (lowerText.includes(insurer)) {
            name = insurer.toUpperCase() + ' Vehicle Insurance';
            break;
        }
    }
    // Extract policy number
    const policyMatch = text.match(/[Pp]olicy\s*(?:[Nn]o\.?|[Nn]umber)?\s*:?\s*([A-Z0-9-]{5,20})/);
    if (policyMatch) {
        policyNumber = policyMatch[1];
    }
    // Extract insured amount
    const amountMatch = text.match(/[Ii]nsured\s*(?:[Vv]alue|[Aa]mount)\s*:?\s*(?:Rs\.|Rs|INR|₹)?\s*([\d,]+\.?\d*)/);
    if (amountMatch) {
        insuredAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }
    // Extract renewal date
    const dateMatch = text.match(/[Rr]enewal\s*[Dd]ate\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
    if (dateMatch) {
        renewalDate = new Date(dateMatch[1].replace(/-/g, '/'));
    }
    return {
        name,
        type: 'vehicle',
        policyNumber,
        insuredAmount,
        renewalDate,
        source: 'detected'
    };
};
// Check if a financial asset is in the static list
export const isAssetInStaticList = (asset) => {
    if (!asset || !asset.type || !asset.name) {
        return false;
    }
    const name = asset.name.toLowerCase();
    switch (asset.type) {
        case 'bank_account':
            return staticList.bank_accounts.some((item) => name.includes(item.toLowerCase()));
        case 'insurance':
        case 'vehicle':
            return staticList.insurances.some((item) => name.includes(item.toLowerCase()));
        default:
            return false;
    }
};
