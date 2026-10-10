import { useLocation } from "react-router-dom";
import { LandingFooter } from "@/components/landing/LandingPage";
export default function Footer() {
  const { pathname } = useLocation();
  return (
    <div className="rebequi-landing">
      <LandingFooter
        showMobileCart={
          ![/^\/carrinho/, /^\/checkout/].some((pattern) =>
            pattern.test(pathname),
          )
        }
      />
    </div>
  );
}
