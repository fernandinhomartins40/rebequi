import { useEffect, useRef, type ReactNode } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { ArrowLeft, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './button';
import './wizard-layout.css';

type Props = {
  steps: string[];
  currentStep: number;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  busy?: boolean;
  complete?: boolean;
};

/** A focused page shell shared by the steps of a customer task. */
export function WizardLayout({ steps, currentStep, title, description, children, footer, onBack, busy, complete }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep, title]);

  return (
    <main className={`task-wizard${footer ? ' task-wizard-with-footer' : ''}`}>
      <header className="task-wizard-brand">
        <div>
          <Link to="/" aria-label="Voltar à loja Rebequi"><BrandLogo /></Link>
          <span>Solicitar orçamento</span>
        </div>
      </header>
      <div className="task-wizard-content">
        <nav aria-label="Etapas do orçamento" className="task-wizard-progress">
          <ol>
            {steps.map((label, index) => {
              const finished = complete || index < currentStep;
              return <li key={label} aria-current={!complete && index === currentStep ? 'step' : undefined} data-complete={finished}>
                <span className="task-wizard-step-number">{finished ? <Check size={16} aria-hidden="true" /> : index + 1}</span>
                <span>{label}</span>
              </li>;
            })}
          </ol>
        </nav>
        {onBack && <Button variant="ghost" onClick={onBack} disabled={busy} className="task-wizard-back"><ArrowLeft size={16} />Voltar</Button>}
        <div className="task-wizard-heading">
          <h1 ref={heading} tabIndex={-1}>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {children}
      </div>
      {footer && <footer className="task-wizard-footer"><div>{footer}</div></footer>}
    </main>
  );
}
