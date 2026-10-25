import { useEffect, useState } from "react";
import { DEFAULT_PRODUCT, type ProductLandingConfig } from "@shared/catalog";
import { api } from "@/services/api";
import { newProduct, type StoredProduct } from "./product-model";

type ProductResponse = {
  pages: StoredProduct[];
  revisions: Array<{ revision: number }>;
};
export function useProductEditor() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [page, setPage] = useState<ProductLandingConfig>(
    structuredClone(DEFAULT_PRODUCT)
  );
  const [saved, setSaved] = useState(JSON.stringify(DEFAULT_PRODUCT));
  const [storedSlug, setStoredSlug] = useState<string | null>(
    DEFAULT_PRODUCT.slug
  );
  const [revisions, setRevisions] = useState<Array<{ revision: number }>>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = !storedSlug || JSON.stringify(page) !== saved;
  const stored = products.find(p => p.slug === storedSlug);

  function adopt(
    product: StoredProduct,
    history: Array<{ revision: number }> = []
  ) {
    setPage(structuredClone(product.draft));
    setStoredSlug(product.slug);
    setSaved(JSON.stringify(product.draft));
    setRevisions(history);
  }
  async function loadProducts() {
    const data = await api<ProductResponse>("/api/pages?mode=admin");
    setProducts(data.pages);
    return data.pages;
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await api<{ authenticated: boolean }>("/api/session");
        if (!active) return;
        if (!session.authenticated) setAuthenticated(false);
        if (session.authenticated) {
          const data = await api<ProductResponse>("/api/pages?mode=admin");
          if (active) {
            setAuthenticated(true);
            setProducts(data.pages);
            adopt(
              data.pages.find(p => p.slug === DEFAULT_PRODUCT.slug) ||
                data.pages[0]
            );
          }
        }
      } catch (e) {
        if (active) {
          setAuthenticated(false);
          setError((e as Error).message);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const canLeave = () =>
    !dirty || window.confirm("لديك تعديلات غير محفوظة. هل تريد تركها؟");
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const select = (slug: string) => {
    if (!canLeave()) return;
    void run(async () => {
      const data = await api<ProductResponse>(
        "/api/pages?mode=admin&slug=" + encodeURIComponent(slug)
      );
      adopt(data.pages[0], data.revisions);
    });
  };
  const create = (duplicate = false) => {
    if (!canLeave()) return;
    const fresh = newProduct();
    setPage(
      duplicate
        ? {
            ...structuredClone(page),
            slug: fresh.slug,
            tracking: { ...fresh.tracking, campaignName: page.name },
          }
        : fresh
    );
    setStoredSlug(null);
    setRevisions([]);
    setMessage("منتج جديد: أضف البيانات والصورة ثم احفظ المسودة.");
    setError("");
  };
  const change = <K extends keyof ProductLandingConfig>(
    key: K,
    value: ProductLandingConfig[K]
  ) => setPage(p => ({ ...p, [key]: value }));
  const save = () =>
    void run(async () => {
      const first = page.bundles?.[0];
      const config = {
        ...page,
        price: first?.price || page.price,
        shortName: page.shortName.trim() || page.name,
        headline: page.headline.trim() || page.name,
        tracking: {
          ...page.tracking,
          campaignName: page.tracking.campaignName.trim() || page.name,
        },
      };
      await api("/api/pages", {
        action: storedSlug ? "save" : "create",
        slug: storedSlug || config.slug,
        page: config,
      });
      await loadProducts();
      const data = await api<ProductResponse>(
        "/api/pages?mode=admin&slug=" + encodeURIComponent(config.slug)
      );
      adopt(data.pages[0], data.revisions);
      setMessage("حُفظ المنتج كمسودة. يمكنك معاينته ثم نشره.");
    });
  const publish = () => {
    if (dirty) {
      setError("احفظ التعديلات أولًا ثم انشر المسودة.");
      return;
    }
    void run(async () => {
      await api("/api/pages", {
        action: "publish",
        slug: storedSlug,
        expectedDraft: page,
      });
      await loadProducts();
      const data = await api<ProductResponse>(
        "/api/pages?mode=admin&slug=" + encodeURIComponent(page.slug)
      );
      adopt(data.pages[0], data.revisions);
      setMessage("نُشر المنتج وصفحة الهبوط بنجاح.");
    });
  };
  const restore = (revision: number) => {
    if (!canLeave()) return;
    void run(async () => {
      await api("/api/pages", { action: "restore", slug: page.slug, revision });
      await loadProducts();
      const data = await api<ProductResponse>(
        "/api/pages?mode=admin&slug=" + encodeURIComponent(page.slug)
      );
      adopt(data.pages[0], data.revisions);
      setMessage("استُرجعت المسودة. راجعها ثم انشرها.");
    });
  };
  const preview = () => {
    sessionStorage.setItem("maisonverre:preview", JSON.stringify(page));
    window.open("/?preview=1", "_blank");
  };
  return {
    authenticated,
    products,
    page,
    storedSlug,
    stored,
    revisions,
    dirty,
    message,
    error,
    busy,
    select,
    create,
    change,
    save,
    publish,
    restore,
    preview,
  };
}
