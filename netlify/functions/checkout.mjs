// Netlify Function: vytvoří platbu ve Stripe Checkout a vrátí adresu platební stránky.
import { handleCheckout } from '../../server/orders.mjs';
export default request => handleCheckout(request, process.env);
export const config = { path: '/api/checkout' };
