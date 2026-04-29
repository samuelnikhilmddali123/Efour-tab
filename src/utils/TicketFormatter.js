/**
 * Formats ticket data into ESC/POS like text commands or structured layout.
 * Since the native printer uses printText, we'll aim for a high-fidelity text-based layout.
 */

export const formatTicket = (ride, ticketId, mobile, user, paymentMode = 'UPI') => {
    const date = new Date();
    const dateFormat = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeFormat = `${String(hours).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${ampm}`;
    
    const shortId = ticketId.split('-').slice(-2).join('-').toUpperCase();

    // ESC/POS Formatting (if library supports it)
    // We'll use a mix of text and standard Esc/Pos spaces
    
    const separator = '--------------------------------';
    
    let ticket = '';
    
    // Header
    ticket += `\x1b\x61\x01`; // Center
    ticket += `\x1b\x21\x30ETHREE\n`; // Bold + Double height
    ticket += `\x1b\x21\x00${dateFormat}   ${timeFormat}\n`;
    ticket += `\x1b\x21\x01ID: ${shortId}\n`;
    ticket += `${separator}\n`;
    
    // Ride Name
    ticket += `\x1b\x21\x18${ride.name.toUpperCase()}\n`; // Bold + Double height
    if (ride.name.toLowerCase().includes('combo')) {
        ticket += `(7 RIDES INCLUDED)\n`;
    }
    
    // Price
    ticket += `\x1b\x21\x30 PRICE: ${ride.price}/-\n`;
    ticket += `\x1b\x21\x00MODE: ${paymentMode}\n`;
    
    // Footer
    ticket += `${separator}\n`;
    ticket += `\x1b\x21\x01VALID ON BOOKED DATE ONLY\n`;
    ticket += `EXPIRES ON SCAN\n`;
    ticket += `NO REFUND - VISIT AGAIN\n\n`;
    
    ticket += `WWW.ETHREE.IN\n`;
    ticket += `Ph: 70369 23456\n`;
    
    // Cut command (Omitted here as we use cutPaper() in App.js)
    // ticket += `\x1d\x56\x42\x00`; 
    
    return { text: ticket, id: ticketId };
};

export const generateTicketsForCart = (cart, masterId, mobile, user, paymentMode) => {
    const list = [];
    cart.forEach((item, index) => {
        const isCombo = item.name.toLowerCase().includes('combo');
        const count = isCombo ? (item.quantity * 7) : item.quantity;
        const prefix = isCombo ? 'C' : 'R';
        
        for (let i = 0; i < count; i++) {
            const subId = `${masterId}-${prefix}${list.length + 1}`;
            list.push(formatTicket(item, subId, mobile, user, paymentMode));
        }
    });
    return list;
};
