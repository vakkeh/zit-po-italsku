// Netlify Function: Stripe po zaplacení volá tuto adresu → založení zásilky (a faktury).
import { handleStripeWebhook } from '../../server/orders.mjs';
export default request => handleStripeWebhook(request, process.env);
export const config = { path: '/api/stripe-webhook' };
