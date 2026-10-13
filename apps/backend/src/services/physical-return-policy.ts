import { ConflictError } from '../utils/errors.util.js';
export type PhysicalReturnOrigin = 'NOT_RECEIVED' | 'RECEIVED_FROM_CUSTOMER';
export function reconcilePhysicalReturn(input: { sold: number; previouslyReturned: number; received: number | null; quantity: number; origin?: PhysicalReturnOrigin }) {
  if (input.received === null) {
    if (input.origin) throw new ConflictError('Esta venda não possui acompanhamento físico para confirmar a origem.');
    return { origin: null, receivedAfter: null };
  }
  const origin = input.origin ?? (input.received === 0 ? 'NOT_RECEIVED' : undefined);
  if (!origin) throw new ConflictError('Informe se o material ainda não foi recebido ou voltou do cliente.');
  const available = origin === 'RECEIVED_FROM_CUSTOMER' ? input.received : input.sold - input.previouslyReturned - input.received;
  if (input.quantity > available) throw new ConflictError('Quantidade maior que o saldo físico desta origem. Confira os materiais recebidos.');
  return { origin, receivedAfter: input.received - (origin === 'RECEIVED_FROM_CUSTOMER' ? input.quantity : 0) };
}
