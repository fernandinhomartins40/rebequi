import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function CartPage() {
  const { items, isEmpty, subtotal, removeItem, updateQuantity, totalItems } = useCart();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f4f7ff_100%)]">
      <Header />

      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#dfe6f7] bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,252,237,0.96))] p-6 shadow-[0_28px_72px_-48px_rgba(37,99,235,0.22)] sm:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] xl:items-end">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Carrinho</p>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Revise os produtos antes de seguir para o checkout
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  O pedido e registrado no painel antes do redirecionamento para o WhatsApp, o que permite acompanhar
                  carrinhos abandonados e acionar a recuperacao de vendas.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Itens</p>
                  <p className="mt-3 text-2xl font-bold text-foreground">{totalItems}</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Subtotal</p>
                  <p className="mt-3 text-2xl font-bold text-foreground">{formatPrice(subtotal)}</p>
                </div>
              </div>
            </div>
          </section>

          {isEmpty ? (
            <Card className="border-dashed border-black/10 bg-white/92 text-center shadow-[0_22px_60px_-48px_rgba(15,23,42,0.24)]">
              <CardHeader>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Seu carrinho esta vazio</CardTitle>
                <CardDescription>
                  Adicione produtos da vitrine publica para montar o pedido e seguir para o checkout.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button asChild>
                  <Link to="/categorias">Explorar catálogo</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <section className="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-4">
                {items.map((item) => (
                  <Card key={item.productId} className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
                    <CardContent className="grid gap-4 p-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:p-5">
                      <Link to={`/produto/${item.slug}`} className="overflow-hidden rounded-2xl border border-black/5 bg-slate-50">
                        <img src={item.image} alt={item.name} className="aspect-square h-full w-full object-cover" />
                      </Link>

                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {item.category}
                            </p>
                            <Link to={`/produto/${item.slug}`} className="mt-1 block text-lg font-semibold text-foreground hover:text-primary">
                              {item.name}
                            </Link>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-red-600"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-2xl border border-black/10 bg-slate-50">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-r-none"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="min-w-14 text-center text-sm font-semibold text-foreground">
                              {item.quantity}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-l-none"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{formatPrice(item.price)} por unidade</p>
                            <p className="text-lg font-bold text-primary">{formatPrice(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="h-fit border-[#e7dcc3] bg-white/96 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
                <CardHeader>
                  <CardTitle>Resumo do pedido</CardTitle>
                  <CardDescription>
                    O checkout registra o pedido primeiro e depois abre a conversa com a loja no WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Produtos</span>
                      <span className="font-semibold text-foreground">{totalItems}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-base">
                      <span className="font-semibold text-foreground">Subtotal estimado</span>
                      <span className="text-xl font-bold text-primary">{formatPrice(subtotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button asChild className="w-full">
                      <Link to="/checkout">Seguir para o checkout</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/categorias">Continuar comprando</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          <Button asChild variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a loja
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
