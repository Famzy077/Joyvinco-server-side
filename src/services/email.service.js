const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- Setup email transporter (reusable) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Sends the initial order confirmation email to the customer and a notification to all admins.
 * @param {object} order - The newly created order object.
 * @param {object} cartItems - The items that were in the cart.
 */
const sendNewOrderEmails = async (order, cartItems, totalAmount) => {
    try {
        const customer = await prisma.user.findUnique({ where: { id: order.userId } });
        if (!customer) throw new Error('Customer not found for order email.');

        // 2. Send confirmation to the Customer
        const customerTemplatePath = path.resolve(process.cwd(), 'src/views/customer-order-confirmation.ejs');
        // 2. Pass totalAmount here
        const customerHtml = await ejs.renderFile(customerTemplatePath, { order, customer, cartItems, totalAmount });
        
        await transporter.sendMail({
            from: `"Joyvinco" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject: `Your Joyvinco Order is Confirmed! #${order.id.slice(-6)}`,
            html: customerHtml,
        });

        // 3. Notify all Admins
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        const adminEmails = admins.map(admin => admin.email);

        if (adminEmails.length > 0) {
            const adminTemplatePath = path.resolve(process.cwd(), 'src/views/admin-new-order.ejs');
            // 3. Also pass totalAmount here
            const adminHtml = await ejs.renderFile(adminTemplatePath, { order, customer, cartItems, totalAmount });

            await transporter.sendMail({
                from: `"Joyvinco" <${process.env.EMAIL_USER}>`,
                to: adminEmails.join(','),
                subject: `[ADMIN] New Order Received! #${order.id.slice(-6)}`,
                html: adminHtml,
            });
        }
    } catch (error) {
        console.error("--- Failed to send new order notification emails ---", error);
    }
};
/**
 * Sends a shipping confirmation email to the customer.
 * @param {object} order - The order object that has been updated to "SHIPPED".
 */
const sendShippingConfirmationEmail = async (order) => {
    try {
        const customer = await prisma.user.findUnique({ where: { id: order.userId } });
        if (!customer) throw new Error('Customer not found for shipping email.');

        const templatePath = path.resolve(process.cwd(), 'src/views/customer-shipped-notification.ejs');
        const emailHtml = await ejs.renderFile(templatePath, { order, customer });

        await transporter.sendMail({
            from: `"Joyvinco" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject: `Your Joyvinco Order Has Shipped! #${order.id.slice(-6)}`,
            html: emailHtml,
        });
    } catch (error) {
        console.error("--- Failed to send SHIPPED notification email ---", error);
    }
};


/**
 * Sends a delivery confirmation email to the customer.
 * @param {object} order - The order object that has been updated to "DELIVERED".
 */
const sendDeliveryConfirmationEmail = async (order) => {
    try {
        const customer = await prisma.user.findUnique({ where: { id: order.userId } });
        if (!customer) throw new Error('Customer not found for delivery email.');

        const templatePath = path.resolve(process.cwd(), 'src/views/customer-delivered-notification.ejs');
        const emailHtml = await ejs.renderFile(templatePath, { order, customer });

        await transporter.sendMail({
            from: `"Joyvinco" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject: `Your Joyvinco Order #${order.id.slice(-6)} Has Been Delivered!`,
            html: emailHtml,
        });
    } catch (error) {
        console.error("--- Failed to send DELIVERED notification email ---", error);
    }
};

/**
 * --- NEW ---
 * Sends an order cancellation email to the customer.
 * @param {object} order - The order object that has been updated to "CANCELLED".
 */
const sendCancellationEmail = async (order) => {
    try {
        const customer = await prisma.user.findUnique({ where: { id: order.userId } });
        if (!customer) throw new Error('Customer not found for cancellation email.');

        const templatePath = path.resolve(process.cwd(), 'src/views/customer-cancelled-notification.ejs');
        const emailHtml = await ejs.renderFile(templatePath, { order, customer });

        await transporter.sendMail({
            from: `"Joyvinco" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject: `Your Joyvinco Order #${order.id.slice(-6)} Has Been Cancelled`,
            html: emailHtml,
        });
    } catch (error) {
        console.error("--- Failed to send CANCELLED notification email ---", error);
    }
};


// --- THE FIX: Add the missing functions to the export list ---
module.exports = {
    sendNewOrderEmails,
    sendShippingConfirmationEmail,
    sendDeliveryConfirmationEmail,
    sendCancellationEmail,
};