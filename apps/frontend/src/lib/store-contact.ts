import { formatWhatsapp, isValidWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';

const fallbackWhatsapp = '11999999999';
const rawWhatsapp = import.meta.env.VITE_STORE_WHATSAPP || fallbackWhatsapp;
const normalizedWhatsapp = normalizeWhatsapp(rawWhatsapp) || fallbackWhatsapp;

export const STORE_CONTACT = {
  address: ['Rua dos Materiais, 123', 'Centro - Sao Paulo, SP', 'CEP: 01234-567'],
  email: 'contato@rebequi.com.br',
  openingHours: ['Seg - Sex: 7h as 18h', 'Sabado: 7h as 16h', 'Domingo: 8h as 12h'],
  whatsappDigits: normalizedWhatsapp,
  whatsappDisplay: isValidWhatsapp(normalizedWhatsapp)
    ? formatWhatsapp(normalizedWhatsapp)
    : '(11) 99999-9999',
  whatsappHref: `https://wa.me/55${normalizedWhatsapp}`,
};
