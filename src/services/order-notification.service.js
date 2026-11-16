import Order from '../models/order.model.js';
import sendEmail from '../utils/sendEmail.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export const sendOrderConfirmation = async (orderId) => {
  const order = await Order.findById(orderId).populate('user', 'name email');
  if (!order || order.confirmationEmailStatus === 'sent') return;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const itemRows = order.orderItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)} (x${item.qty})</td>
      <td style="text-align:right">₦${(item.price * item.qty).toFixed(2)}</td>
    </tr>
  `).join('');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  try {
    await sendEmail({
      email: order.user.email,
      subject: `Order confirmed - #${order._id.toString().slice(-8)}`,
      message: `
        <p>Hello ${escapeHtml(order.user.name)},</p>
        <p>Your order has been received${order.isPaid ? ' and your payment is confirmed' : ''}.</p>
        <table style="width:100%;border-collapse:collapse"><tbody>${itemRows}</tbody></table>
        <p><strong>Total: ₦${order.totalPrice.toFixed(2)}</strong></p>
        <p><a href="${new URL(`/order/${order._id}`, frontendUrl).toString()}">View your order</a></p>
      `,
    });
    order.confirmationEmailStatus = 'sent';
    order.confirmationEmailSentAt = new Date();
    await order.save();
  } catch (error) {
    order.confirmationEmailStatus = 'failed';
    await order.save();
    console.error(`Order confirmation email failed for ${order._id}:`, error.message);
  }
};
