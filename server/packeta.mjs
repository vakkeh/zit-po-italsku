// Zásilkovna (Packeta) REST/XML API: https://www.zasilkovna.cz/api/rest
// Dokumentace: https://docs.packeta.com — createPacket vrací id a čárový kód „Z…“.
import { HttpError } from './http.mjs';

const xml = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const unxml = s => s.replace(/&(lt|gt|amp|apos|quot);/g, (_, e) => ({ lt: '<', gt: '>', amp: '&', apos: "'", quot: '"' }[e]));
const tag = (body, name) => body.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];

// Výdejní místo z widgetu. Vlastní místa Zásilkovny mají číselné id, místa
// externích dopravců se posílají přes carrierId + kód místa dopravce.
export function validatePoint(point) {
  const p = point && typeof point === 'object' ? point : {};
  const text = (v, max) => String(v ?? '').trim().slice(0, max);
  if (p.carrierId || p.carrierPickupPointId) {
    if (!/^\d{1,10}$/.test(String(p.carrierId)) || !/^[\w-]{1,32}$/.test(String(p.carrierPickupPointId))) return null;
    return { addressId: String(p.carrierId), carrierPickupPoint: String(p.carrierPickupPointId), label: text(p.label, 200) };
  }
  if (!/^\d{1,10}$/.test(String(p.id))) return null;
  return { addressId: String(p.id), carrierPickupPoint: '', label: text(p.label, 200) };
}

// Zásilkovna vyžaduje jméno i příjmení (max. 32 znaků).
export function splitName(fullName) {
  const words = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { name: 'Zákazník', surname: 'Zákazník' };
  const surname = words.length > 1 ? words.pop() : words[0];
  return { name: words.join(' ').slice(0, 32), surname: surname.slice(0, 32) };
}

export function packetXml(apiPassword, attributes) {
  const fields = Object.entries(attributes).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `<${k}>${xml(v)}</${k}>`).join('');
  return `<createPacket><apiPassword>${xml(apiPassword)}</apiPassword><packetAttributes>${fields}</packetAttributes></createPacket>`;
}

export function parsePacketResponse(body, httpStatus = 200) {
  const status = tag(body, 'status');
  if (status === 'ok') {
    const id = tag(body, 'id'), barcode = tag(body, 'barcode');
    if (id && barcode) return { id, barcode, barcodeText: tag(body, 'barcodeText') || barcode };
  }
  const detail = unxml((tag(body, 'detail') || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  const message = [tag(body, 'string') && unxml(tag(body, 'string')), detail].filter(Boolean).join(' – ') || `neočekávaná odpověď (HTTP ${httpStatus})`;
  // Chyba v údajích (fault) se opakováním nespraví; výpadek serveru ano.
  throw new HttpError(`Zásilkovna: ${message}`, status === 'fault' ? 422 : httpStatus >= 500 ? httpStatus : 502);
}

export async function createPacket(apiPassword, attributes, fetchImpl = fetch) {
  if (!apiPassword) throw new HttpError('Chybí PACKETA_API_PASSWORD.', 500);
  const response = await fetchImpl('https://www.zasilkovna.cz/api/rest', { method: 'POST', headers: { 'content-type': 'application/xml; charset=utf-8' }, body: packetXml(apiPassword, attributes) });
  return parsePacketResponse(await response.text(), response.status);
}
