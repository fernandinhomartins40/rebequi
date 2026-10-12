import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, LockKeyhole, MessageCircleMore, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { registerSchema } from '@rebequi/shared/schemas';
import { formatWhatsapp } from '@rebequi/shared/utils';
import { z } from 'zod';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { saveProvisionalCredentials } from '@/lib/provisional-credentials';
import { STORE_CONTACT } from '@/lib/store-contact';
import { ApiError } from '@/services/api/client';
import { clearReferralIntent, readReferralIntent } from '@/lib/partner-referral';
import {
  checkoutAuthenticatedOrder,
  checkoutPublicOrder,
  markPublicOrderWhatsappRedirected,
} from '@/services/api/orders';
import type { CheckoutOrderResponse, RegisterDTO } from '@/types';

const publicCheckoutSchema = registerSchema.extend({
  customerNote: z.string().max(1000, 'Observacao muito longa').optional(),
});

type PublicCheckoutFormValues = RegisterDTO & {
  customerNote?: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function openWhatsappWindow(whatsappUrl: string) {
  const popup = window.open('about:blank', '_blank');

  if (popup) {
    popup.location.href = whatsappUrl;
    return true;
  }

  window.location.href = whatsappUrl;
  return false;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, refreshSession } = useAuth();
  const { items, subtotal, totalItems, isEmpty, clearCart } = useCart();
  const [customerNote, setCustomerNote] = useState('');
  const [referralCode, setReferralCode] = useState(readReferralIntent);
  const [referralConfirmed, setReferralConfirmed] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CheckoutOrderResponse | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PublicCheckoutFormValues>({
    resolver: zodResolver(publicCheckoutSchema),
    defaultValues: {
      customerNote: '',
      name: '',
      whatsapp: '',
    },
  });

  const publicWhatsappValue = watch('whatsapp');

  const publicCheckoutMutation = useMutation({
    mutationFn: checkoutPublicOrder,
  });

  const authenticatedCheckoutMutation = useMutation({
    mutationFn: checkoutAuthenticatedOrder,
  });

  const cartItemsPayload = items.map((item) => ({
    productId: item.productId,
    promotionId: item.promotionId,
    quantity: item.quantity,
  }));

  const handleCheckoutSuccess = async (result: CheckoutOrderResponse, shouldRefreshSession: boolean) => {
    if (shouldRefreshSession) {
      saveProvisionalCredentials(result.provisionalCredentials);
      await refreshSession().catch(() => null);
    }

    clearCart();
    clearReferralIntent();
    setCompletedOrder(result);
    openWhatsappWindow(result.whatsappUrl);
    void markPublicOrderWhatsappRedirected(result.order.id).catch(() => undefined);

    toast({
      title: 'Pedido registrado',
      description: `Pedido ${result.order.referenceCode} enviado para a conversa da loja.`,
    });
  };

  const handlePublicSubmit = handleSubmit(async (values) => {
    try {
      const result = await publicCheckoutMutation.mutateAsync({
        ...(referralCode && referralConfirmed ? { referral: { code: referralCode, confirmed: true as const } } : {}),
        customerNote: values.customerNote?.trim() || undefined,
        items: cartItemsPayload,
        name: values.name,
        whatsapp: values.whatsapp,
      });

      await handleCheckoutSuccess(result, true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'LOGIN_REQUIRED') {
        toast({
          title: 'Login necessario',
          description: 'Ja existe cadastro para este WhatsApp. Entre para concluir o pedido.',
        });

        navigate('/login', {
          replace: true,
          state: {
            from: {
              hash: location.hash,
              pathname: '/checkout',
              search: location.search,
            },
            prefillIdentifier: values.whatsapp,
          },
        });
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Falha ao registrar pedido',
        description: error instanceof Error ? error.message : 'Não foi possível concluir o checkout.',
      });
    }
  });

  const handleAuthenticatedCheckout = async () => {
    try {
      const result = await authenticatedCheckoutMutation.mutateAsync({
        ...(referralCode && referralConfirmed ? { referral: { code: referralCode, confirmed: true as const } } : {}),
        customerNote: customerNote.trim() || undefined,
        items: cartItemsPayload,
      });

      await handleCheckoutSuccess(result, false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao registrar pedido',
        description: error instanceof Error ? error.message : 'Não foi possível concluir o checkout.',
      });
    }
  };

  if (isEmpty && !completedOrder) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f4f7ff_100%)]">
        <Header />
        <main className="container mx-auto px-4 py-16 sm:px-6">
          <Card className="mx-auto max-w-2xl border-dashed border-black/10 bg-white/92 text-center shadow-[0_22px_60px_-48px_rgba(15,23,42,0.24)]">
            <CardHeader>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Carrinho vazio</CardTitle>
              <CardDescription>Adicione produtos antes de seguir para o checkout.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/carrinho">Voltar para o carrinho</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (completedOrder) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f4f7ff_100%)]">
        <Header />
        <main className="pb-16 pt-10">
          <div className="container mx-auto space-y-8 px-4 sm:px-6">
            <Card className="border-[#d9ebd4] bg-[linear-gradient(160deg,rgba(240,253,244,0.96),rgba(255,255,255,0.98))] shadow-[0_28px_72px_-48px_rgba(22,163,74,0.22)]">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-700" />
                </div>
                <div>
                  <CardTitle className="text-3xl">Pedido registrado com sucesso</CardTitle>
                  <CardDescription className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    O pedido {completedOrder.order.referenceCode} já foi salvo no painel administrativo. Se o WhatsApp
                    não abriu ou o cliente desistir de enviar a mensagem, a equipe ainda consegue acompanhar e recuperar
                    a venda por la.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Referencia</p>
                    <p className="mt-3 text-lg font-bold text-foreground">{completedOrder.order.referenceCode}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Itens</p>
                    <p className="mt-3 text-lg font-bold text-foreground">{completedOrder.order.itemCount}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Subtotal</p>
                    <p className="mt-3 text-lg font-bold text-foreground">{formatPrice(completedOrder.order.subtotal)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="gap-2">
                    <a href={completedOrder.whatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircleMore className="h-4 w-4" />
                      Abrir WhatsApp novamente
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/painel-cliente?tab=orders&orderId=${completedOrder.order.id}`}>Acompanhar pedido</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/">Voltar para a vitrine</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isAuthenticated && user?.role !== 'CUSTOMER') {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f4f7ff_100%)]">
        <Header />
        <main className="container mx-auto px-4 py-16 sm:px-6">
          <Alert>
            <LockKeyhole className="h-4 w-4" />
            <AlertTitle>Sessao administrativa detectada</AlertTitle>
            <AlertDescription>
              O checkout publico funciona apenas para clientes. Saia da conta atual ou use uma conta de cliente para
              concluir pedidos pela vitrine.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  const isCustomerAuthenticated = isAuthenticated && user?.role === 'CUSTOMER';
  const isSubmitting = publicCheckoutMutation.isPending || authenticatedCheckoutMutation.isPending;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f4f7ff_100%)]">
      <Header />

      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <Button asChild variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
            <Link to="/carrinho">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o carrinho
            </Link>
          </Button>

          <section className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              {referralCode ? <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-semibold">Indicação profissional</h2><p className="break-all text-xs text-slate-500">{referralCode}</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={referralConfirmed} disabled={isSubmitting} onChange={event => setReferralConfirmed(event.target.checked)} />Confirmo que este profissional indicou esta compra e autorizo o vínculo deste pedido.</label><p className="text-xs text-slate-500">O profissional verá a referência e o andamento, sem seu nome, contato ou itens.</p><Button variant="ghost" size="sm" disabled={isSubmitting} onClick={() => { clearReferralIntent(); setReferralCode(null); setReferralConfirmed(false); }}>Remover indicação</Button></section> : null}
              <Card className="border-[#dfe6f7] bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,252,237,0.96))] shadow-[0_28px_72px_-48px_rgba(37,99,235,0.22)]">
                <CardHeader className="space-y-3">
                  <Badge className="w-fit border-none bg-primary/10 text-primary">Checkout</Badge>
                  <CardTitle className="text-3xl">Finalize o pedido pela conversa da loja</CardTitle>
                  <CardDescription className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    O pedido e salvo primeiro. Depois disso a conversa com a loja abre automaticamente no WhatsApp para
                    o cliente confirmar o atendimento.
                  </CardDescription>
                </CardHeader>
              </Card>

              {isCustomerAuthenticated ? (
                <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
                  <CardHeader>
                    <CardTitle>Dados da conta autenticada</CardTitle>
                    <CardDescription>
                      O checkout vai usar as informações da conta do cliente já conectada.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoBox label="Cliente" value={user?.name || '-'} />
                      <InfoBox label="WhatsApp" value={user?.whatsapp ? formatWhatsapp(user.whatsapp) : '-'} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="authenticated-customer-note">Observacoes do pedido</Label>
                      <Textarea
                        id="authenticated-customer-note"
                        placeholder="Ex.: entregar apos as 14h ou separar material para retirada."
                        value={customerNote}
                        onChange={(event) => setCustomerNote(event.target.value)}
                      />
                    </div>

                    <Button className="w-full" disabled={isSubmitting} onClick={() => void handleAuthenticatedCheckout()}>
                      {authenticatedCheckoutMutation.isPending ? 'Registrando pedido...' : 'Registrar e abrir WhatsApp'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
                  <CardHeader>
                    <CardTitle>Seus dados para o checkout</CardTitle>
                    <CardDescription>
                      Se já existir cadastro para este WhatsApp, o sistema vai pedir login e retornar voce para esta etapa.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-5" onSubmit={handlePublicSubmit}>
                      <div className="space-y-2">
                        <Label htmlFor="checkout-name">Nome</Label>
                        <Input id="checkout-name" placeholder="Seu nome" {...register('name')} />
                        {errors.name ? <p className="text-sm text-red-500">{errors.name.message}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="checkout-whatsapp">WhatsApp com DDD</Label>
                        <Input
                          id="checkout-whatsapp"
                          inputMode="tel"
                          placeholder="(11) 99999-0000"
                          value={publicWhatsappValue}
                          {...register('whatsapp')}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                            setValue('whatsapp', formatWhatsapp(digits), { shouldValidate: true });
                          }}
                        />
                        {errors.whatsapp ? <p className="text-sm text-red-500">{errors.whatsapp.message}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="checkout-note">Observacoes do pedido</Label>
                        <Textarea
                          id="checkout-note"
                          placeholder="Ex.: entregar apos as 14h ou separar material para retirada."
                          {...register('customerNote')}
                        />
                        {errors.customerNote ? <p className="text-sm text-red-500">{errors.customerNote.message}</p> : null}
                      </div>

                      <div className="space-y-3">
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                          {publicCheckoutMutation.isPending ? 'Registrando pedido...' : 'Registrar e abrir WhatsApp'}
                        </Button>
                        <Button asChild type="button" variant="outline" className="w-full">
                          <Link
                            to="/login"
                            state={{
                              from: {
                                hash: location.hash,
                                pathname: '/checkout',
                                search: location.search,
                              },
                              prefillIdentifier: publicWhatsappValue,
                            }}
                          >
                            Ja tenho cadastro, entrar
                          </Link>
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card className="border-[#e7dcc3] bg-white/96 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
                <CardHeader>
                  <CardTitle>Resumo do pedido</CardTitle>
                  <CardDescription>
                    Esta lista sera convertida em mensagem para o WhatsApp da loja {STORE_CONTACT.whatsappDisplay}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50 px-3 py-3">
                        <img src={item.image} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {formatPrice(item.quantity * item.price)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Itens</span>
                      <span className="font-semibold text-foreground">{totalItems}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-base">
                      <span className="font-semibold text-foreground">Subtotal estimado</span>
                      <span className="text-xl font-bold text-primary">{formatPrice(subtotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <MessageCircleMore className="h-4 w-4" />
                <AlertTitle>Recuperação de venda ativa</AlertTitle>
                <AlertDescription>
                  Mesmo se o cliente não concluir o envio da mensagem no WhatsApp, este pedido continua visível no painel
                  administrativo para acompanhamento e recuperação comercial.
                </AlertDescription>
              </Alert>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
