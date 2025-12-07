import { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Visão geral', icon: <Home className="h-4 w-4" />, active: true },
  { label: 'Pedidos', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Produtos', icon: <Package className="h-4 w-4" /> },
  { label: 'Clientes', icon: <Users className="h-4 w-4" /> },
  { label: 'Configurações', icon: <Settings className="h-4 w-4" /> },
];

const MerchantDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-slate-900 text-slate-100 transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold">
            RB
          </div>
          <div>
            <p className="text-sm text-slate-300">Painel do Lojista</p>
            <p className="text-lg font-semibold">Rebequi</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                item.active ? 'bg-primary/20 text-white' : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-3 py-4">
          <div className="rounded-md bg-slate-800 px-3 py-3">
            <p className="text-sm text-slate-300">Conta ativa</p>
            <p className="font-semibold text-white">admin@rebequi.com</p>
            <Button variant="ghost" size="sm" className="mt-2 flex items-center gap-2 px-0 text-slate-200">
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
                  <CheckCircle2 className="h-4 w-4" /> Visão geral
                </p>
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Painel administrativo</h1>
                  <p className="text-muted-foreground">Controle pedidos, estoque e configurações em um só lugar.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline">Configurações</Button>
                  <Button>Adicionar produto</Button>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<ShoppingBag className="h-5 w-5 text-primary" />} label="Pedidos hoje" value="32" delta="+8 vs ontem" />
              <StatCard icon={<Package className="h-5 w-5 text-primary" />} label="Itens em estoque" value="1.284" delta="12 baixos" />
              <StatCard icon={<BarChart3 className="h-5 w-5 text-primary" />} label="Receita (semana)" value="R$ 48.200" delta="+12%" />
              <StatCard icon={<Settings className="h-5 w-5 text-primary" />} label="Tarefas pendentes" value="5" delta="3 urgentes" />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle>Pedidos recentes</CardTitle>
                  <CardDescription>Últimos pedidos aguardando ação.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['#1023', '#1022', '#1021', '#1020'].map((order) => (
                    <div key={order} className="flex items-center justify-between rounded-md border bg-white px-4 py-3">
                      <div>
                        <p className="font-medium">Pedido {order}</p>
                        <p className="text-sm text-muted-foreground">Pagamento aprovado • Separação</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Detalhes
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Alertas de estoque</CardTitle>
                  <CardDescription>Produtos próximos do limite mínimo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['Cimento CP-II 50kg', 'Tinta Acrílica 18L', 'Broca SDS 8mm'].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-md border bg-white px-4 py-3">
                      <div>
                        <p className="font-medium">{item}</p>
                        <p className="text-sm text-muted-foreground">Repor em breve</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Repor
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Ações rápidas</CardTitle>
                  <CardDescription>Atalhos para rotinas frequentes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Cadastrar produto', icon: <PackageCheck className="h-4 w-4" /> },
                    { label: 'Criar pedido manual', icon: <ClipboardList className="h-4 w-4" /> },
                    { label: 'Configurar frete', icon: <Settings className="h-4 w-4" /> },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:border-primary hover:bg-primary/5"
                    >
                      <span className="flex items-center gap-2">{item.icon}{item.label}</span>
                      <span className="text-xs text-muted-foreground">Ir</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle>Configurações principais</CardTitle>
                  <CardDescription>Itens críticos para deixar sua loja pronta.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    { title: 'Pagamentos', desc: 'Gateways, split e conciliação.' },
                    { title: 'Entrega', desc: 'Transportadoras e SLA por região.' },
                    { title: 'Catálogo', desc: 'Categorias, atributos e variações.' },
                    { title: 'Equipe', desc: 'Permissões e convites de usuários.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-md border bg-white p-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                      <Button variant="ghost" size="sm" className="mt-2 px-0 text-primary">
                        Configurar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
}) => (
  <Card className="shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{delta}</p>
    </CardContent>
  </Card>
);

export default MerchantDashboard;
