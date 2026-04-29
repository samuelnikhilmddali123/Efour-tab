/**
 * Formats ticket data into the EXACT replica of the ETHREE sample image.
 * Matches spacing and alignment for 32 characters (58mm).
 */

export const formatTicket = (ride, ticketId, mobile, user, paymentMode = 'UPI') => {
    const date = new Date();
    const dateFormat = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeFormat = `${hours}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')} ${ampm}`;
    
    const separator = '--------------------------------'; // 32 dashes
    
    // ESC/POS Commands
    const ESC = '\x1b';
    const CENTER = `${ESC}\x61\x01`;
    const LEFT = `${ESC}\x61\x00`;
    const RESET = `${ESC}\x21\x00`;
    const BOLD = `${ESC}\x21\x08`;

    let ticket = '';
    
    // Header (Centered)
    ticket += CENTER;
    ticket += `${BOLD}ETHREE${RESET}\n`;
    ticket += `Eat. Enjoy. Entertain\n`;
    ticket += `${separator}\n\n`; // Spacing after separator
    
    // Metadata (Left)
    ticket += LEFT;
    ticket += `ID: ${ticketId}\n`;
    ticket += `Date: ${dateFormat}, ${timeFormat}\n\n`; // Spacing after date
    
    // Ride Info
    const rideName = ride.name.toUpperCase().substring(0, 15);
    const qtyText = "x1";
    const spaces = " ".repeat(32 - rideName.length - qtyText.length);
    
    ticket += `${BOLD}${rideName}${spaces}${qtyText}${RESET}\n`;
    ticket += `Price: INR ${ride.price}\n\n\n`; // Spacing before separator
    
    ticket += `${separator}\n\n\n`; // Spacing after separator
    
    // Total
    ticket += `${BOLD}TOTAL PAYABLE: INR ${ride.price}${RESET}\n\n\n`; // Spacing before UPI
    
    // Payment Mode (Centered)
    ticket += CENTER;
    ticket += `*** ${paymentMode} ***\n\n\n`; // Spacing before footer
    
    // Footer (Centered)
    ticket += `WWW.ETHREE.IN\n`;
    ticket += `Support: +91 70369 23456\n`;
    ticket += `Thank You! Visit Again\n`;
    
    return { text: ticket, id: ticketId };
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
