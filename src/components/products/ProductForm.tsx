"use client";

import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigationRouter } from "@/components/shell/useNavigationRouter";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { IconAlert } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/api";
import { canApplySkuSuggestion } from "@/lib/productSku";
import {
  DEFAULT_MARGIN_PERCENT,
  computeCostFromSalePrice,
  computeMarginAmount,
  computeExtraMarginPercent,
  computePercentFromPrices,
  computeUnitSalePrice,
  deriveUnitProductName,
  formatUnitSaleCalculation,
  hasMinimumSalePriceDigits,
  roundPriceToSuggestedAmount,
  computeSalePriceFromCost,
} from "@/lib/products";
import { formatMoney } from "@/lib/money";
import { isValidStockQuantityKg } from "@/lib/inventory";
import {
  Category,
  CategoryList,
  Product,
  ProductConflict,
  ProductPayload,
  ProductSkuSuggestion,
  Role,
} from "@/lib/types";

const INVERSE_COST_DEBOUNCE_MS = 500;

function Notice({
  tone,
  id,
  role,
  children,
}: {
  tone: "warning" | "error";
  id?: string;
  role?: "alert" | "status";
  children: ReactNode;
}) {
  const resolvedRole = role ?? (tone === "error" ? "alert" : "status");
  const toneClass =
    tone === "error"
      ? "border-error/40 bg-error/10 text-error"
      : "border-warning/40 bg-warning/10 text-warning";
  return (
    <p
      id={id}
      role={resolvedRole}
      aria-live={resolvedRole === "status" ? "polite" : undefined}
      className={`flex items-start gap-2 rounded-app border px-3 py-2.5 text-sm ${toneClass}`}
    >
      <IconAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function ProductForm({
  product,
  roles = [],
}: {
  product?: Product;
  roles?: Role[];
}) {
  const router = useNavigationRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [skuSuggestionState, setSkuSuggestionState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [skuSuggestionError, setSkuSuggestionError] = useState<string | null>(
    null,
  );
  const [conflict, setConflict] = useState(false);
  const [barcodeConflict, setBarcodeConflict] = useState<Product | null>(null);
  const [nameConflict, setNameConflict] = useState<ProductConflict | null>(
    null,
  );
  const [barcodeLookupNotice, setBarcodeLookupNotice] = useState<string | null>(
    null,
  );
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [stockInitializationOpen, setStockInitializationOpen] = useState(false);
  const [initialStockQuantity, setInitialStockQuantity] = useState("0");
  const [initialStockReason, setInitialStockReason] = useState("");
  const [stockInitializationError, setStockInitializationError] = useState<
    string | null
  >(null);
  const [stockInitializationFieldError, setStockInitializationFieldError] =
    useState<string | null>(null);
  const [stockInitializationPending, setStockInitializationPending] =
    useState(false);
  const [unitSaleError, setUnitSaleError] = useState<string | null>(null);
  const skuRequestId = useRef(0);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const unitsPerPackageRef = useRef<HTMLInputElement>(null);
  const inverseCostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const skuManuallyEditedRef = useRef(Boolean(product));

  const initialSalePrice = product
    ? product.unit_type === "pesable"
      ? (product.price_per_kg ?? "")
      : (product.price ?? "")
    : "";
  const [marginPercent, setMarginPercent] = useState(() =>
    String(
      computePercentFromPrices(product?.cost ?? "", initialSalePrice) ??
        DEFAULT_MARGIN_PERCENT,
    ),
  );
  const [priceSuggestionVisible, setPriceSuggestionVisible] = useState(false);
  const [sellsByUnit, setSellsByUnit] = useState(
    product?.sells_by_unit ?? false,
  );
  const [unitsPerPackage, setUnitsPerPackage] = useState(() =>
    product?.sells_by_unit ? String(product.units_per_package) : "",
  );
  const [extraMarginPercent, setExtraMarginPercent] = useState(() =>
    product?.sells_by_unit ? product.extra_margin_percent : "0",
  );
  const [unitPrice, setUnitPrice] = useState(
    product?.unit_product?.price ?? "",
  );
  const [unitPriceSuggestion, setUnitPriceSuggestion] = useState(
    product?.unit_product?.price ?? "",
  );
  const [unitPriceManuallyEdited, setUnitPriceManuallyEdited] = useState(false);

  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    category_id: product?.category_id ?? "",
    unit_type: product ? (product.unit_type ?? "unitario") : "",
    price: roundPriceToSuggestedAmount(product?.price ?? ""),
    price_per_kg: roundPriceToSuggestedAmount(product?.price_per_kg ?? ""),
    cost: product?.cost ?? "",
  });

  useEffect(() => {
    // limit=100: cubre el tamaño de kiosco hasta que exista paginación real
    // en este selector (add-frontend-users, sección 7.2).
    api<CategoryList>("/categories?limit=100")
      .then((res) => setCategories(res.categories))
      .catch((e: ApiError) => setError(e.message));
  }, []);

  useEffect(() => {
    if (conflict) skuInputRef.current?.focus();
  }, [conflict]);

  useEffect(
    () => () => {
      if (inverseCostTimerRef.current !== null) {
        clearTimeout(inverseCostTimerRef.current);
      }
    },
    [],
  );

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "name") setNameConflict(null);
  }

  function activePriceField(unitType: string): "price" | "price_per_kg" {
    return unitType === "pesable" ? "price_per_kg" : "price";
  }

  function clearInverseCostTimer() {
    if (inverseCostTimerRef.current !== null) {
      clearTimeout(inverseCostTimerRef.current);
      inverseCostTimerRef.current = null;
    }
  }

  function effectiveMarginPercent(value: string): number {
    const parsed = value.trim() === "" ? Number.NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : DEFAULT_MARGIN_PERCENT;
  }

  function onCostChange(value: string) {
    clearInverseCostTimer();
    const nextPrice = computeSalePriceFromCost(
      value,
      effectiveMarginPercent(marginPercent),
    );
    setPriceSuggestionVisible(nextPrice !== null);
    setForm((current) => {
      const priceField = activePriceField(current.unit_type);
      return nextPrice === null
        ? { ...current, cost: value }
        : { ...current, cost: value, [priceField]: nextPrice };
    });
  }

  function onCostBlur() {
    const price = form[activePriceField(form.unit_type)];
    const actualPercent = computePercentFromPrices(form.cost, price);
    if (actualPercent !== null && price !== "0") {
      setMarginPercent(String(actualPercent));
    }
  }

  function onMarginPercentChange(value: string) {
    clearInverseCostTimer();
    setMarginPercent(value);
    const nextPrice = computeSalePriceFromCost(
      form.cost,
      effectiveMarginPercent(value),
    );
    setPriceSuggestionVisible(nextPrice !== null);
    setForm((current) => {
      const priceField = activePriceField(current.unit_type);
      return nextPrice === null
        ? current
        : { ...current, [priceField]: nextPrice };
    });
  }

  function onPriceChange(value: string) {
    clearInverseCostTimer();
    setPriceSuggestionVisible(false);
    setForm((current) => {
      const priceField = activePriceField(current.unit_type);
      const nextPercent = computePercentFromPrices(current.cost, value);
      if (nextPercent !== null) {
        setMarginPercent(String(nextPercent));
        return { ...current, [priceField]: value };
      }

      if (!hasMinimumSalePriceDigits(value)) {
        return { ...current, [priceField]: value };
      }

      const percent = effectiveMarginPercent(marginPercent);
      inverseCostTimerRef.current = setTimeout(() => {
        setForm((latest) => {
          const latestPriceField = activePriceField(latest.unit_type);
          if (
            latest[latestPriceField] !== value ||
            computePercentFromPrices(latest.cost, value) !== null
          ) {
            return latest;
          }

          const nextCost = computeCostFromSalePrice(value, percent);
          return nextCost === null ? latest : { ...latest, cost: nextCost };
        });
        inverseCostTimerRef.current = null;
      }, INVERSE_COST_DEBOUNCE_MS);
      return { ...current, [priceField]: value };
    });
    if (sellsByUnit && form.unit_type === "unitario") {
      const next = computeUnitSalePrice(
        value,
        Number(unitsPerPackage),
        Number(extraMarginPercent),
      );
      if (next !== null) {
        setUnitPrice(next);
        setUnitPriceSuggestion(next);
        setUnitPriceManuallyEdited(false);
      }
    }
  }

  function recalculateUnitPrice(
    nextUnits = unitsPerPackage,
    nextMargin = extraMarginPercent,
    nextPackagePrice = form.price,
  ) {
    const next = computeUnitSalePrice(
      nextPackagePrice,
      Number(nextUnits),
      Number(nextMargin),
    );
    if (next !== null) {
      setUnitPrice(next);
      setUnitPriceSuggestion(next);
      setUnitPriceManuallyEdited(false);
    }
  }

  function onUnitSaleToggle(checked: boolean) {
    setSellsByUnit(checked);
    setUnitSaleError(null);
    if (checked) {
      setTimeout(() => unitsPerPackageRef.current?.focus(), 0);
      recalculateUnitPrice();
    }
  }

  function onUnitTypeChange(value: string) {
    set("unit_type", value);
    if (value === "pesable") {
      setSellsByUnit(false);
      setUnitsPerPackage("");
      setExtraMarginPercent("0");
      setUnitPrice("");
      setUnitSaleError(null);
    }
  }

  function onUnitsPerPackageChange(value: string) {
    setUnitsPerPackage(value);
    setUnitSaleError(null);
    recalculateUnitPrice(value);
  }

  function onExtraMarginChange(value: string) {
    setExtraMarginPercent(value);
    setUnitSaleError(null);
    recalculateUnitPrice(unitsPerPackage, value);
  }

  function onUnitPriceChange(value: string) {
    setUnitPrice(value);
    setUnitPriceManuallyEdited(true);
    setUnitSaleError(null);
    const nextMargin = computeExtraMarginPercent(
      form.price,
      Number(unitsPerPackage),
      value,
    );
    if (nextMargin !== null) setExtraMarginPercent(String(nextMargin));
  }

  function resetUnitPriceSuggestion() {
    if (!unitPriceSuggestion) return;
    setUnitPrice(unitPriceSuggestion);
    const nextMargin = computeExtraMarginPercent(
      form.price,
      Number(unitsPerPackage),
      unitPriceSuggestion,
    );
    if (nextMargin !== null) setExtraMarginPercent(String(nextMargin));
    setUnitPriceManuallyEdited(false);
  }

  function onSkuChange(value: string) {
    set("sku", value);
    skuManuallyEditedRef.current = true;
    setSkuSuggestionError(null);
  }

  function onBarcodeChange(value: string) {
    set("barcode", value);
    setBarcodeConflict(null);
    setBarcodeLookupNotice(null);
  }

  async function checkBarcode(event: KeyboardEvent<HTMLInputElement>) {
    if (product || event.key !== "Enter") return;
    event.preventDefault();
    const barcode = form.barcode.trim();
    if (!barcode) {
      setBarcodeConflict(null);
      setBarcodeLookupNotice(null);
      return;
    }

    try {
      const found = await api<Product>(
        `/products/barcode/${encodeURIComponent(barcode)}`,
      );
      setBarcodeConflict(found);
      setBarcodeLookupNotice(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 404) {
        setBarcodeConflict(null);
        setBarcodeLookupNotice(null);
      } else {
        setBarcodeConflict(null);
        setBarcodeLookupNotice(
          "No se pudo verificar el código ahora. Podés continuar y el servidor lo validará al crear el producto.",
        );
      }
    }
  }

  function onCategoryChange(categoryId: string) {
    set("category_id", categoryId);
    setSkuSuggestionError(null);
    skuRequestId.current += 1;
    const requestId = skuRequestId.current;

    if (!categoryId || product) {
      setSkuSuggestionState("idle");
      return;
    }

    setSkuSuggestionState("loading");
    api<ProductSkuSuggestion>(
      `/products/sku-suggestion?category_id=${encodeURIComponent(categoryId)}`,
    )
      .then(({ sku }) => {
        if (requestId !== skuRequestId.current) return;
        if (!canApplySkuSuggestion(skuManuallyEditedRef.current)) {
          setSkuSuggestionState("idle");
          return;
        }
        setForm((current) => ({ ...current, sku }));
        skuManuallyEditedRef.current = false;
        setSkuSuggestionState("success");
      })
      .catch((e: ApiError) => {
        if (requestId !== skuRequestId.current) return;
        setSkuSuggestionState("error");
        setSkuSuggestionError(e.message);
      });
  }

  const priceField = activePriceField(form.unit_type);
  const activePrice = form[priceField];
  const marginAmount = computeMarginAmount(form.cost, activePrice);
  const marginPercentValue = computePercentFromPrices(form.cost, activePrice);
  const marginText =
    marginAmount !== null && marginPercentValue !== null
      ? `Margen: ${formatMoney(marginAmount)} (${marginPercentValue}%)`
      : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (barcodeConflict) return;
    setError(null);
    setConflict(false);
    setNameConflict(null);
    setPending(true);
    const payload: ProductPayload = {
      ...form,
      unit_type: form.unit_type as ProductPayload["unit_type"],
      price: form.unit_type === "pesable" ? "0.00" : form.price,
      price_per_kg:
        form.unit_type === "pesable" ? form.price_per_kg : undefined,
      barcode: form.barcode.trim() || undefined,
      sells_by_unit: form.unit_type === "unitario" ? sellsByUnit : undefined,
      units_per_package:
        form.unit_type === "unitario" && sellsByUnit
          ? Number(unitsPerPackage)
          : undefined,
      extra_margin_percent:
        form.unit_type === "unitario" && sellsByUnit
          ? extraMarginPercent
          : undefined,
    };
    try {
      if (product) {
        await api(`/products/${product.id}`, { method: "PUT", body: payload });
        toast("success", "Producto actualizado");
      } else {
        const created = await api<Product>("/products", {
          method: "POST",
          body: payload,
        });
        setCreatedProduct(created);
        return;
      }
      router.push("/products");
      router.refresh();
    } catch (e) {
      const apiError = e as ApiError;
      setConflict(apiError.status === 409);
      setNameConflict(apiError.conflict ?? null);
      setError(apiError.message);
      if (sellsByUnit) setUnitSaleError(apiError.message);
    } finally {
      setPending(false);
    }
  }

  function resetCreationForm() {
    setCreatedProduct(null);
    setStockInitializationOpen(false);
    setInitialStockQuantity("0");
    setInitialStockReason("");
    setStockInitializationError(null);
    setStockInitializationFieldError(null);
    setForm({
      sku: "",
      barcode: "",
      name: "",
      category_id: "",
      unit_type: "",
      price: "",
      price_per_kg: "",
      cost: "",
    });
    setError(null);
    setConflict(false);
    setBarcodeConflict(null);
    setNameConflict(null);
    setBarcodeLookupNotice(null);
    setSkuSuggestionState("idle");
    setSkuSuggestionError(null);
    skuManuallyEditedRef.current = false;
    setMarginPercent(String(DEFAULT_MARGIN_PERCENT));
    setPriceSuggestionVisible(false);
    setSellsByUnit(false);
    setUnitsPerPackage("");
    setExtraMarginPercent("0");
    setUnitPrice("");
    setUnitPriceSuggestion("");
    setUnitPriceManuallyEdited(false);
    setUnitSaleError(null);
    router.replace("/products/new");
    router.refresh();
  }

  function openStockInitialization() {
    setStockInitializationError(null);
    setStockInitializationFieldError(null);
    setInitialStockQuantity(
      createdProduct?.unit_type === "pesable" ? "0.000" : "0",
    );
    setStockInitializationOpen(true);
  }

  async function submitStockInitialization(event: FormEvent) {
    event.preventDefault();
    if (!createdProduct) return;
    setStockInitializationError(null);
    const isWeighable = createdProduct.unit_type === "pesable";
    if (
      isWeighable &&
      !isValidStockQuantityKg(initialStockQuantity, true)
    ) {
      setStockInitializationFieldError(
        "Ingresá una cantidad mayor o igual a cero con hasta tres decimales.",
      );
      return;
    }
    setStockInitializationFieldError(null);
    setStockInitializationPending(true);
    try {
      await api("/inventory/stock", {
        method: "POST",
        body: {
          product_id: createdProduct.id,
          quantity: isWeighable
            ? initialStockQuantity
            : parseInt(initialStockQuantity, 10),
          reason: initialStockReason.trim(),
        },
      });
      toast("success", "Stock inicializado");
      resetCreationForm();
    } catch (e) {
      setStockInitializationError((e as ApiError).message);
    } finally {
      setStockInitializationPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <Card className="min-w-0">
            <section
              aria-labelledby="product-information-heading"
              className="flex flex-col gap-4"
            >
              <div className="border-b border-border pb-4">
                <h2
                  id="product-information-heading"
                  className="text-base font-semibold tracking-tight"
                >
                  Datos del producto
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Identificá el producto y asociá su categoría.
                </p>
              </div>
              {!product && (
                <>
                  <Input
                    label="Código de barras (opcional)"
                    value={form.barcode}
                    onChange={(e) => onBarcodeChange(e.target.value)}
                    onKeyDown={checkBarcode}
                    autoFocus
                    aria-describedby="product-barcode-help"
                  />
                  {barcodeConflict && (
                    <Notice
                      tone="warning"
                      role="alert"
                      id="product-barcode-help"
                    >
                      Ya existe “{barcodeConflict.name}” con el SKU{" "}
                      {barcodeConflict.sku}.{" "}
                      <a
                        href={`/products/${barcodeConflict.id}`}
                        className="font-medium underline underline-offset-2"
                      >
                        Abrir ficha para editarlo
                      </a>
                    </Notice>
                  )}
                  {barcodeLookupNotice && (
                    <p
                      id="product-barcode-help"
                      className="-mt-2 text-sm text-text-secondary"
                      role="status"
                    >
                      {barcodeLookupNotice}
                    </p>
                  )}
                </>
              )}
              <Input
                label="Nombre"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                autoFocus={Boolean(product)}
              />
              {nameConflict && (
                <Notice tone="warning" role="alert">
                  Ya existe un producto con este nombre: {nameConflict.name} (
                  {nameConflict.sku}).{" "}
                  <a
                    href={`/products/${nameConflict.id}`}
                    className="font-medium underline underline-offset-2"
                  >
                    Ver producto
                  </a>
                </Notice>
              )}
              {!product ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select
                      label="Categoría"
                      value={form.category_id}
                      onChange={(e) => onCategoryChange(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Elegí una categoría
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="SKU (automático)"
                      id="product-sku"
                      ref={skuInputRef}
                      value={form.sku}
                      onChange={(e) => onSkuChange(e.target.value)}
                      aria-describedby="product-sku-help"
                      readOnly
                      aria-readonly="true"
                      title="El SKU se asigna automáticamente"
                    />
                  </div>
                </>
              ) : (
                <>
                  <Select
                    label="Categoría"
                    value={form.category_id}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Elegí una categoría
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="SKU (automático)"
                    id="product-sku"
                    ref={skuInputRef}
                    value={form.sku}
                    onChange={(e) => onSkuChange(e.target.value)}
                    aria-describedby="product-sku-help"
                    readOnly
                    aria-readonly="true"
                    title="El SKU se asigna automáticamente"
                  />
                </>
              )}
              {!product && (
                <div
                  id="product-sku-help"
                  className="-mt-2 text-sm text-text-secondary"
                  aria-live="polite"
                  role="status"
                >
                  {skuSuggestionState === "loading" &&
                    "Buscando una propuesta de SKU…"}
                  {skuSuggestionState === "success" &&
                    "Propuesta automática. Se asigna al crear el producto."}
                  {skuSuggestionState === "error" &&
                    `No se pudo obtener una propuesta. ${skuSuggestionError ?? "El backend intentará generarlo al crear el producto."}`}
                </div>
              )}
              {product && (
                <Input
                  label="Código de barras (opcional)"
                  value={form.barcode}
                  onChange={(e) => set("barcode", e.target.value)}
                />
              )}
            </section>
          </Card>

          <Card className="min-w-0">
            <section
              aria-labelledby="product-pricing-heading"
              className="flex flex-col gap-4"
            >
              <div className="border-b border-border pb-4">
                <h2
                  id="product-pricing-heading"
                  className="text-base font-semibold tracking-tight"
                >
                  Precio y margen
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Definí el costo y la ganancia para calcular el precio de
                  venta.
                </p>
              </div>
              <Select
                label="Tipo de producto"
                value={form.unit_type}
                onChange={(e) => onUnitTypeChange(e.target.value)}
                required
              >
                <option value="" disabled>
                  Elegí un tipo
                </option>
                <option value="unitario">Unitario</option>
                <option value="pesable">Pesable (por kg)</option>
              </Select>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  className="sm:col-span-2"
                  label="Costo"
                  inputMode="decimal"
                  pattern="\d+(\.\d{1,2})?"
                  placeholder="0.00"
                  title="Número con hasta dos decimales, p. ej. 980.00"
                  value={form.cost}
                  onChange={(e) => onCostChange(e.target.value)}
                  onBlur={onCostBlur}
                  required
                />
                <Input
                  className="sm:col-span-1"
                  label="% de ganancia"
                  inputMode="decimal"
                  pattern="-?\d+(\.\d{1})?"
                  placeholder={String(DEFAULT_MARGIN_PERCENT)}
                  title="Número con hasta un decimal, p. ej. 30"
                  value={marginPercent}
                  onChange={(e) => onMarginPercentChange(e.target.value)}
                />
                <div className="sm:col-span-3">
                  <Input
                    label={
                      form.unit_type === "pesable"
                        ? "Precio por kilo"
                        : "Precio de venta"
                    }
                    id="product-sale-price"
                    inputMode="numeric"
                    pattern="\d+"
                    placeholder="0"
                    title="Número entero en pesos, p. ej. 1251"
                    value={
                      form.unit_type === "pesable"
                        ? form.price_per_kg
                        : form.price
                    }
                    onChange={(e) => onPriceChange(e.target.value)}
                    aria-describedby={
                      marginText ? "product-price-margin" : undefined
                    }
                    required
                  />
                  {priceSuggestionVisible && (
                    <p className="mt-1.5 text-sm text-text-secondary">
                      Precio sugerido
                    </p>
                  )}
                  {marginText && (
                    <p
                      id="product-price-margin"
                      className="mt-1.5 text-sm text-text-secondary"
                      aria-live="polite"
                      role="status"
                    >
                      {marginText}
                    </p>
                  )}
                </div>
              </div>
              {form.unit_type === "unitario" && (
                <div className="flex flex-col gap-4 rounded-tight border border-border bg-surface-subtle p-4">
                  <label className="flex items-start gap-3 text-sm font-medium text-text-primary">
                    <input
                      type="checkbox"
                      checked={sellsByUnit}
                      disabled={Boolean(
                        product?.unit_product &&
                        !product.unit_product.active &&
                        !roles.includes("admin"),
                      )}
                      onChange={(event) =>
                        onUnitSaleToggle(event.target.checked)
                      }
                      aria-expanded={sellsByUnit}
                      aria-controls="unit-sale-fields"
                      className="mt-0.5 size-5 accent-primary"
                    />
                    Este producto también se vende por unidad
                  </label>
                  {product?.unit_product &&
                    !product.unit_product.active &&
                    !roles.includes("admin") && (
                      <p className="-mt-2 text-sm text-text-secondary">
                        Sólo un administrador puede volver a habilitar la venta
                        por unidad.
                      </p>
                    )}
                  {product?.sells_by_unit && !sellsByUnit && (
                    <Notice tone="warning">
                      El producto por unidad se va a desactivar. Conserva su
                      historial de ventas y su stock, y podés volver a
                      habilitarlo cuando quieras.
                    </Notice>
                  )}
                  {sellsByUnit && (
                    <div
                      id="unit-sale-fields"
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                    >
                      <div>
                        <Input
                          ref={unitsPerPackageRef}
                          label="Unidades por paquete"
                          inputMode="numeric"
                          value={unitsPerPackage}
                          onChange={(event) =>
                            onUnitsPerPackageChange(event.target.value)
                          }
                          aria-describedby="units-per-package-help"
                          error={unitSaleError ?? undefined}
                          disabled={pending}
                          required
                        />
                        <p
                          id="units-per-package-help"
                          className="mt-1 text-xs leading-4 text-text-secondary"
                        >
                          Cuántas unidades sueltas trae cada paquete cerrado.
                        </p>
                        {product?.sells_by_unit &&
                          unitsPerPackage !==
                            String(product.units_per_package) && (
                            <div className="mt-1.5">
                              <Notice tone="warning">
                                Cambiar las unidades por paquete afecta las
                                conversiones futuras. El stock actual no se
                                modifica: si un paquete abierto tiene más
                                unidades sueltas que el nuevo tamaño, se
                                mantienen hasta consumirse.
                              </Notice>
                            </div>
                          )}
                      </div>
                      <Input
                        label="Margen extra por unidad (%)"
                        inputMode="decimal"
                        value={extraMarginPercent}
                        onChange={(event) =>
                          onExtraMarginChange(event.target.value)
                        }
                        error={unitSaleError ?? undefined}
                        disabled={pending}
                        required
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Precio de venta por unidad"
                          inputMode="numeric"
                          value={unitPrice}
                          onChange={(event) =>
                            onUnitPriceChange(event.target.value)
                          }
                          aria-describedby="unit-sale-calculation"
                          disabled={pending}
                          required
                        />
                        {formatUnitSaleCalculation(
                          form.price,
                          Number(unitsPerPackage),
                          Number(extraMarginPercent),
                          unitPrice,
                        ) && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p
                              id="unit-sale-calculation"
                              className="text-xs leading-4 text-text-secondary"
                            >
                              {formatUnitSaleCalculation(
                                form.price,
                                Number(unitsPerPackage),
                                Number(extraMarginPercent),
                                unitPrice,
                              )}
                            </p>
                            {unitPriceManuallyEdited && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={resetUnitPriceSuggestion}
                              >
                                Volver al sugerido
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {unitPrice && (
                        <div className="flex min-w-0 flex-col gap-1 rounded-app border border-border bg-surface-subtle px-3 py-2.5 text-sm sm:col-span-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <div className="min-w-0">
                            <p className="text-text-secondary">
                              Se creará también
                            </p>
                            <p className="truncate font-medium text-text-primary">
                              {deriveUnitProductName(form.name || "Producto")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone="neutral">Por unidad</Badge>
                            <span className="num font-semibold text-text-primary">
                              {formatMoney(unitPrice)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {product?.sells_by_unit &&
                    form.price !== product.price &&
                    sellsByUnit && (
                      <Notice tone="warning">
                        Al cambiar el precio del paquete, el precio por unidad
                        se recalcula con el margen extra guardado y se pierde
                        cualquier precio por unidad que hayas puesto a mano.
                      </Notice>
                    )}
                </div>
              )}
            </section>
          </Card>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 -mx-1 flex flex-wrap gap-3 rounded-app border border-border bg-surface p-3 shadow-soft">
          <Button
            type="submit"
            pending={pending}
            pendingImmediate
            disabled={Boolean(barcodeConflict || nameConflict)}
          >
            {pending
              ? "Guardando…"
              : product
                ? "Guardar cambios"
                : "Crear producto"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/products")}
          >
            Cancelar
          </Button>
        </div>
      </form>
      <Dialog
        open={Boolean(createdProduct)}
        title={
          stockInitializationOpen
            ? "Inicializar stock"
            : createdProduct?.unit_product
              ? "Se crearon 2 productos"
              : "Producto creado"
        }
        onClose={resetCreationForm}
        dismissible={!stockInitializationPending}
      >
        {createdProduct &&
          (stockInitializationOpen ? (
            <form
              onSubmit={submitStockInitialization}
              className="flex flex-col gap-4"
            >
              <p className="text-sm text-text-secondary">
                Cargá el stock inicial de {createdProduct.name} sin salir de
                Productos.
              </p>
              <Input
                label={
                  createdProduct.unit_type === "pesable"
                    ? "Cantidad inicial (kg)"
                    : "Cantidad inicial"
                }
                type="number"
                inputMode={
                  createdProduct.unit_type === "pesable" ? "decimal" : "numeric"
                }
                min={0}
                step={createdProduct.unit_type === "pesable" ? "0.001" : "1"}
                placeholder={
                  createdProduct.unit_type === "pesable" ? "0.000" : undefined
                }
                value={initialStockQuantity}
                onChange={(event) =>
                  setInitialStockQuantity(event.target.value)
                }
                required
                error={stockInitializationFieldError ?? undefined}
              />
              {createdProduct.unit_type === "pesable" && (
                <p className="text-sm text-text-secondary">
                  Ingresá los kilogramos con hasta tres decimales.
                </p>
              )}
              <Input
                label="Motivo"
                value={initialStockReason}
                onChange={(event) => setInitialStockReason(event.target.value)}
                placeholder="Carga inicial de mercadería"
                required
              />
              {stockInitializationError && (
                <p className="text-sm text-error" role="alert">
                  {stockInitializationError}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStockInitializationOpen(false)}
                  disabled={stockInitializationPending}
                >
                  Volver
                </Button>
                <Button type="submit" pending={stockInitializationPending}>
                  {stockInitializationPending
                    ? "Inicializando…"
                    : "Inicializar stock"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="pop-in flex flex-col items-center gap-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success/12">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-success"
                  />
                  {/* pathLength={1} normalizes the path's length to 1 so the
                    stroke-dasharray/dashoffset draw trick (.check-draw,
                    globals.css) doesn't need the actual SVG path length
                    computed by hand. Same pattern as PosView's sale
                    confirmation checkmark. */}
                  <path
                    d="M6 10.5L8.5 13L14 7.5"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1}
                    className="check-draw text-success"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className="text-sm text-text-secondary">
                {createdProduct.unit_product ? (
                  <>
                    <span className="block">
                      {createdProduct.name} ({createdProduct.sku})
                    </span>
                    <span className="block">
                      {createdProduct.unit_product.name} (
                      {createdProduct.unit_product.sku})
                    </span>
                  </>
                ) : (
                  <>
                    “{createdProduct.name}” quedó creado con el SKU{" "}
                    {createdProduct.sku}.
                  </>
                )}
              </p>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={resetCreationForm}>
                  Ahora no
                </Button>
                <Button onClick={openStockInitialization}>
                  Inicializar stock
                </Button>
              </div>
            </div>
          ))}
      </Dialog>
    </div>
  );
}
