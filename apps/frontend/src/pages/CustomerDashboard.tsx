import { CheckCircle2, LayoutList, LogOut, Package, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="container mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Sessao autenticada
            </p>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Area do cliente</h1>
              <p className="text-muted-foreground">
                Seu acesso esta real e persistido por cookie seguro no backend.
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard
            icon={<UserRound className="h-5 w-5 text-primary" />}
            title="Conta autenticada"
            description={user?.email || 'Usuario autenticado'}
          />
          <StatusCard
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            title="Autenticacao"
            description="Login, registro, cookie e verificacao de sessao estao ativos."
          />
          <StatusCard
            icon={<Package className="h-5 w-5 text-primary" />}
            title="Pedidos"
            description="Modulo ainda nao implementado. Nenhum pedido fake e exibido nesta area."
          />
        </section>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Estado atual da aplicacao</CardTitle>
            <CardDescription>O painel mostra apenas o que existe de fato hoje.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <StateList
              title="Ja implementado"
              items={[
                'Cadastro de cliente com persistencia real no banco.',
                'Login via backend com senha hash e cookie HttpOnly.',
                'Recuperacao da sessao atual por /api/auth/me.',
              ]}
            />
            <StateList
              title="Ainda pendente"
              items={[
                'Pedidos e historico de compras.',
                'Enderecos, pagamentos e favoritos.',
                'Operacoes de perfil alem de logout.',
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatusCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <Card className="shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const StateList = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rounded-lg border bg-slate-50 p-4">
    <div className="mb-3 flex items-center gap-2">
      <LayoutList className="h-4 w-4 text-primary" />
      <p className="font-semibold text-foreground">{title}</p>
    </div>
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="rounded-md bg-white px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default CustomerDashboard;
