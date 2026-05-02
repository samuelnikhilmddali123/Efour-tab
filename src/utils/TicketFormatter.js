import { GS_V_CUT } from './PrinterService';

export const formatTicket = (ride, ticketId, mobile, user, paymentMode = 'UPI') => {
    const date = new Date();
    // Match date format: 4/28/2026, 10:28:04 PM
    const dateFormat = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

    const separator = '--------------------------------'; // 32 dashes

    // ESC/POS Commands
    const ESC = '\x1b';
    const CENTER = `${ESC}\x61\x01`;
    const LEFT = `${ESC}\x61\x00`;
    const RESET = `${ESC}\x21\x00`;
    const BOLD = `${ESC}\x21\x08`;
    const DOUBLE = `${ESC}\x21\x38`; // Bold + Double height/width

    let ticket = '';

    // 1. Header
    ticket += CENTER;
    ticket += `${DOUBLE}EFOUR${RESET}${BOLD}\n`;
    ticket += `Eat. Enjoy. Entertain@Eluru\n`;
    ticket += `${separator}\n`;

    // 2. Metadata
    ticket += LEFT;
    ticket += `ID: ${ticketId}\n`;
    ticket += `Date: ${dateFormat}\n`;
    ticket += `${separator}\n`;

    // 3. Item Info
    const rideName = ride.name.toUpperCase().substring(0, 15);
    const qtyText = "x1";
    const spaces = " ".repeat(32 - rideName.length - qtyText.length);
    ticket += `${rideName}${spaces}${qtyText}\n`;
    ticket += `Price: INR ${ride.price}\n`;
    ticket += `${separator}\n`;

    // 4. Total Section
    ticket += `${BOLD}TOTAL PAYABLE: INR ${ride.price}${RESET}${BOLD}\n`;
    ticket += `${separator}\n`;

    // 5. Payment Mode (Extra Large)
    ticket += CENTER;
    ticket += `${DOUBLE}*** ${paymentMode} ***${RESET}${BOLD}\n\n`;

    // 6. Footer
    ticket += `WWW.EFOUR-ELURU.COM\n`;
    ticket += `Support: +91 70369 23456\n`;
    ticket += `Thank You! Visit Again\n`;

    // 7. Auto Cut (Hardware Command)
    ticket += `\n${GS_V_CUT}`;

    return {
        text: ticket,
        id: ticketId,
        amount: ride.price,     // For AdminDashboard
        price: ride.price,      // Fallback
        rideName: ride.name,
        paymentMode: paymentMode,
        mobile: mobile,
        posId: 'pos1',          // Required by Admin filter
        createdAt: new Date().toISOString()
    };
};

export const generateTicketsForCart = (cart, masterId, mobile, user, paymentMode) => {
    if (!cart || cart.length === 0) return [];
    const list = [];
    cart.forEach((item) => {
        const quantity = item.quantity || 1;
        for (let i = 0; i < quantity; i++) {
            const subId = `${masterId}-R${list.length + 1}`;
            list.push(formatTicket(item, subId, mobile, user, paymentMode));
        }
    });
    return list;
};
