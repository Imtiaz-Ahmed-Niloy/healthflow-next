import Link from "next/link";
import { useTranslations } from "next-intl";

const NotFound = () => {
  const t = useTranslations("notFound");
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("message")}</p>
        <Link href="/" className="text-primary underline hover:text-primary/90">
          {t("home")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
