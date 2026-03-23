import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, LogOut, Package, Settings, ShieldCheck, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNewProducts, fetchProducts, fetchPromotionalProducts } from '@/services/api/products';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const MerchantDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data: productSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'products'],
    queryFn: () => fetchProducts({}),
  });

  const { data: promotionalProducts } = useQuery({
    queryKey: ['merchant-dashboard', 'promotional-products'],
    queryFn: fetchPromotionalProducts,
  });

  const { data: newProducts } = useQuery({
    queryKey: ['merchant-dashboard', 'new-products'],
    queryFn: fetchNewProducts,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="container mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Acesso administrativo autenticado
            </p>
            <div>
              <h1 className="text-3xl font-bold">Painel administrativo</h1>
              <p className="text-muted-foreground">
                Esta area valida a sessao real do administrador antes de liberar o acesso.
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Store className="h-5 w-5 text-primary" />} label="Administrador" value={user?.email || '-'} delta="Sessao atual" />
          <StatCard icon={<Package className="h-5 w-5 text-primary" />} label="Produtos ativos" value={`${productSummary?.total ?? 0}`} delta="Persistidos no banco" />
          <StatCard icon={<ShieldCheck className="h-5 w-5 text-primary" />} label="Produtos em oferta" value={`${promotionalProducts?.length ?? 0}`} delta="Lidos via API real" />
          <StatCard icon={<Settings className="h-5 w-5 text-primary" />} label="Novidades" value={`${newProducts?.length ?? 0}`} delta="Catalogo carregado do backend" />
        </section>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Estado do backoffice</CardTitle>
            <CardDescription>O painel nao inventa pedidos, faturamento ou operacao que ainda nao existe.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <StateList
              title="Ja implementado"
              items={[
                'Login administrativo com sessao persistida por cookie.',
                'Protecao de rota por papel ADMIN.',
                'Catalogo publico carregado de dados persistidos.',
              ]}
            />
            <StateList
              title="Ainda pendente"
              items={[
                'CRUD administrativo completo de categorias e produtos.',
                'Pedidos, clientes, pagamentos e metricas operacionais.',
                'Tela de configuracoes para trocar credenciais e parametros da loja.',
              ]}
            />
          </CardContent>
        </Card>
      </div>
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
      <div className="break-all text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{delta}</p>
    </CardContent>
  </Card>
);

const StateList = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rounded-lg border bg-slate-50 p-4">
    <p className="mb-3 font-semibold text-foreground">{title}</p>
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="rounded-md bg-white px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default MerchantDashboard;
