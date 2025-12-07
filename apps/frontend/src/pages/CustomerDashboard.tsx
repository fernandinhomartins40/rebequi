import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Home,
  Menu,
  Package,
  Truck,
  Wallet,
  Heart,
  User,
  Settings,
  LogOut,
} from "lucide-react";

const sidebarNav = [
  { label: "Início", icon: <Home className="h-4 w-4" />, active: true },
  { label: "Pedidos", icon: <Package className="h-4 w-4" /> },
  { label: "Endereços", icon: <Truck className="h-4 w-4" /> },
  { label: "Pagamentos", icon: <Wallet className="h-4 w-4" /> },
  { label: "Favoritos", icon: <Heart className="h-4 w-4" /> },
  { label: "Perfil", icon: <User className="h-4 w-4" /> },
  { label: "Configurações", icon: <Settings className="h-4 w-4" /> },
];

const bottomNav = [
  { label: "Início", icon: <Home className="h-5 w-5" /> },
  { label: "Pedidos", icon: <Package className="h-5 w-5" /> },
  { label: "Favoritos", icon: <Heart className="h-5 w-5" /> },
  { label: "Perfil", icon: <User className="h-5 w-5" /> },
];

const shortcuts = [
  { title: "Meus pedidos", desc: "Acompanhe status e detalhes", icon: <Package className="h-4 w-4 text-primary" /> },
  { title: "Endereços", desc: "Gerencie entregas e retirada", icon: <Truck className="h-4 w-4 text-primary" /> },
  { title: "Pagamentos", desc: "Cartões e boletos salvos", icon: <Wallet className="h-4 w-4 text-primary" /> },
  { title: "Favoritos", desc: "Produtos salvos para comprar", icon: <Heart className="h-4 w-4 text-primary" /> },
];

const CustomerDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white text-slate-900 transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
            RB
          </div>
          <div>
            <p className="text-sm text-slate-500">Área do cliente</p>
            <p className="text-lg font-semibold text-slate-900">Rebequi</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {sidebarNav.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                item.active ? "bg-primary/10 text-primary font-semibold" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t px-3 py-4">
          <div className="rounded-md bg-slate-50 px-3 py-3">
            <p className="text-sm text-slate-500">Conta ativa</p>
            <p className="font-semibold text-foreground">cliente@example.com</p>
            <Button variant="ghost" size="sm" className="mt-2 flex items-center gap-2 px-0 text-slate-700">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <header className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Área do cliente
                </p>
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Bem-vindo de volta</h1>
                  <p className="text-muted-foreground">Gerencie pedidos, entregas e favoritos em um só lugar.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline">Meus dados</Button>
                  <Button>Ver pedidos</Button>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Último pedido</CardTitle>
                  <CardDescription>Status, pagamento e entrega</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border bg-white px-3 py-3">
                    <div>
                      <p className="font-semibold text-foreground">Pedido #1045</p>
                      <p className="text-sm text-muted-foreground">Aprovado • Separação</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Ver detalhes
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-white px-3 py-3">
                    <div>
                      <p className="font-semibold text-foreground">Entrega</p>
                      <p className="text-sm text-muted-foreground">Prevista: 2-3 dias úteis</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Rastrear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Cupons e benefícios</CardTitle>
                  <CardDescription>Resgate e use em suas compras</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="rounded-md border bg-white px-3 py-3">
                    <p className="font-semibold text-foreground">10% OFF na próxima compra</p>
                    <p className="text-sm text-muted-foreground">Cupom: CLIENTE10 • válido por 7 dias</p>
                  </div>
                  <div className="rounded-md border bg-white px-3 py-3">
                    <p className="font-semibold text-foreground">Frete reduzido</p>
                    <p className="text-sm text-muted-foreground">Disponível para capitais</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shortcuts.map((item) => (
                <Card key={item.title} className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                    {item.icon}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </section>
          </div>
        </div>

        {/* Bottom nav for mobile */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white shadow-lg md:hidden">
          <div className="grid grid-cols-4 py-2">
            {bottomNav.map((item) => (
              <button key={item.label} className="flex flex-col items-center gap-1 text-xs text-slate-600">
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
