import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { useT } from "@/i18n";

export default function PageNotFound() {
  const { t } = useT();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center rise-in">
        <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Sprout className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
        </div>
        <p className="kisan-label">404</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">{t("This field is empty")}</h1>
        <p className="mt-2 text-muted-foreground">{t("The page you were looking for doesn't exist.")}</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground focus-ring">
          {t("Back to Kisan AI")}
        </Link>
      </div>
    </div>
  );
}
