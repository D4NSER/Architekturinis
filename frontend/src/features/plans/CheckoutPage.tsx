import axios from 'axios';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { checkoutPlan, fetchPlanDetail } from '../../api/plans';
import { fetchDiscountCodes, DiscountCode as ApiDiscountCode } from '../../api/discounts';
import type { NutritionPlanDetail, PlanPricingOption } from '../../types';
import { useAuth } from '../auth/AuthContext';

const paymentMethods: Array<{ value: 'card' | 'bank_transfer' | 'cash'; label: string }> = [
  { value: 'card', label: 'Bankinė kortelė' },
  { value: 'bank_transfer', label: 'Bankinis pavedimas' },
  { value: 'cash', label: 'Apmokėjimas atsiimant' },
];

const FIRST_PURCHASE_DISCOUNT = 0.15;
const BIRTHDAY_DISCOUNT_PERCENT = 0.15;
const BIRTHDAY_CODE = 'BIRTHDAY15';
const BIRTHDAY_WINDOW_DAYS = 7;

const goalLabelMap: Record<string, string> = {
  weight_loss: 'Svorio mažinimas',
  muscle_gain: 'Raumenų auginimas',
  balanced: 'Subalansuota mityba',
  vegetarian: 'Vegetariškas gyvenimo būdas',
  performance: 'Sportas ir didelis krūvis',
};

const renderGoalLabel = (goalType: string) => goalLabelMap[goalType] ?? goalType;

const formatCurrency = (value: number, currency = 'EUR') =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency }).format(value);

const formatPeriod = (days: number) => `${days} d.`;

const CheckoutPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [plan, setPlan] = useState<NutritionPlanDetail | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [buyerFullName, setBuyerFullName] = useState(() => {
    if (user?.first_name || user?.last_name) {
      return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    }
    return '';
  });
  const [buyerEmail, setBuyerEmail] = useState(user?.email ?? '');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'cash'>('card');
  const [invoiceNeeded, setInvoiceNeeded] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [vatCode, setVatCode] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const eligibleFirstPurchase = Boolean(user?.eligible_first_purchase_discount);
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [activeDiscount, setActiveDiscount] = useState<'first' | 'birthday' | 'generic' | null>(
    eligibleFirstPurchase ? 'first' : null,
  );
  const [genericCodes, setGenericCodes] = useState<ApiDiscountCode[]>([]);
  const [appliedGenericCode, setAppliedGenericCode] = useState<ApiDiscountCode | null>(null);

  const canUseBirthdayDiscount = useCallback(() => {
    if (!user?.birth_date) return false;
    const birth = new Date(user.birth_date);
    if (Number.isNaN(birth.getTime())) return false;
    const today = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    const createCandidate = (year: number) => {
      const candidate = new Date(year, birth.getMonth(), birth.getDate());
      if (birth.getMonth() === 1 && birth.getDate() === 29 && candidate.getDate() !== 29) {
        return new Date(year, 1, 28);
      }
      return candidate;
    };

    return [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].some((year) => {
      const candidate = createCandidate(year);
      return Math.abs(candidate.getTime() - today.getTime()) <= BIRTHDAY_WINDOW_DAYS * msPerDay;
    });
  }, [user?.birth_date]);

  useEffect(() => {
    const load = async () => {
      if (!planId) {
        setErrorMessage('Nerastas planas apmokėjimui.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const detail = await fetchPlanDetail(Number(planId));
        setPlan(detail);
        const preferredPeriod = Number(searchParams.get('period'));
        const options = detail.pricing_options ?? [];
        if (options.length > 0) {
          const initial =
            options.find((option) => option.period_days === preferredPeriod) ??
            options.slice().sort((a, b) => a.period_days - b.period_days)[0];
          setSelectedPeriod(initial.period_days);
        } else {
          setSelectedPeriod(null);
        }
      } catch (err) {
        setErrorMessage('Nepavyko įkelti plano informacijos apmokėjimui.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [planId, searchParams]);

  useEffect(() => {
    const loadCodes = async () => {
      try {
        const codes = await fetchDiscountCodes();
        setGenericCodes(codes.map((entry) => ({ ...entry, code: entry.code.toUpperCase() })));
      } catch {
        setGenericCodes([]);
      }
    };

    loadCodes();
  }, []);

  useEffect(() => {
    if (eligibleFirstPurchase) {
      if (activeDiscount === null) {
        setActiveDiscount('first');
      }
    } else if (activeDiscount === 'first') {
      setActiveDiscount(null);
    }
  }, [eligibleFirstPurchase, activeDiscount]);

  useEffect(() => {
    if (!discountCode.trim() && (activeDiscount === 'birthday' || activeDiscount === 'generic')) {
      setAppliedGenericCode(null);
      setDiscountError(null);
      setActiveDiscount(eligibleFirstPurchase ? 'first' : null);
    }
  }, [discountCode, activeDiscount, eligibleFirstPurchase]);

  const periodOptions = useMemo<PlanPricingOption[]>(() => {
    if (!plan?.pricing_options) return [];
    return plan.pricing_options.slice().sort((a, b) => a.period_days - b.period_days);
  }, [plan]);

  const activePricing = useMemo(() => {
    if (!selectedPeriod) return null;
    return periodOptions.find((option) => option.period_days === selectedPeriod) ?? null;
  }, [periodOptions, selectedPeriod]);

  useEffect(() => {
    if (activeDiscount === 'generic' && appliedGenericCode) {
      const exists = genericCodes.some(
        (code) => code.code.toUpperCase() === appliedGenericCode.code.toUpperCase(),
      );
      if (!exists) {
        setAppliedGenericCode(null);
        setDiscountError('Šis nuolaidos kodas nebegalioja.');
        setDiscountCode('');
        setActiveDiscount(eligibleFirstPurchase ? 'first' : null);
      }
    }
  }, [genericCodes, activeDiscount, appliedGenericCode, eligibleFirstPurchase]);

  const appliedDiscountPercent = useMemo(() => {
    if (activeDiscount === 'birthday') return BIRTHDAY_DISCOUNT_PERCENT;
    if (activeDiscount === 'generic') return appliedGenericCode?.percent ?? 0;
    if (activeDiscount === 'first' && eligibleFirstPurchase) return FIRST_PURCHASE_DISCOUNT;
    return 0;
  }, [activeDiscount, eligibleFirstPurchase, appliedGenericCode]);

  const pricingSummary = useMemo(() => {
    if (!activePricing) return null;
    const basePrice = activePricing.final_price;
    const currency = activePricing.currency ?? 'EUR';
    const finalPrice = Number((basePrice * (1 - appliedDiscountPercent)).toFixed(2));
    const discountAmount = Number((basePrice - finalPrice).toFixed(2));
    return {
      basePrice,
      finalPrice,
      discountAmount,
      currency,
    };
  }, [activePricing, appliedDiscountPercent]);

  const totalAmount = pricingSummary ? formatCurrency(pricingSummary.finalPrice, pricingSummary.currency) : null;

  const activeDiscountLabel = useMemo(() => {
    if (activeDiscount === 'birthday') {
      return 'Gimtadienio nuolaida (-15%)';
    }
    if (activeDiscount === 'generic' && appliedGenericCode) {
      return `Kodas ${appliedGenericCode.code} (-${Math.round(appliedGenericCode.percent * 100)}%)`;
    }
    if (activeDiscount === 'first' && eligibleFirstPurchase) {
      return 'Pirmo pirkimo nuolaida (-15%)';
    }
    return null;
  }, [activeDiscount, eligibleFirstPurchase, appliedGenericCode]);

  const handleApplyDiscount = () => {
    const normalized = discountCode.trim().toUpperCase();
    if (!normalized) {
      setDiscountError(null);
      setAppliedGenericCode(null);
      setActiveDiscount(eligibleFirstPurchase ? 'first' : null);
      return;
    }

    if (normalized === BIRTHDAY_CODE) {
      if (!user?.birth_date) {
        setDiscountError('Pridėkite gimimo datą profilyje.');
        setActiveDiscount(eligibleFirstPurchase ? 'first' : null);
        return;
      }

      if (!canUseBirthdayDiscount()) {
        setDiscountError('Gimtadienio nuolaida galioja jūsų gimtadienio savaitę.');
        setActiveDiscount(eligibleFirstPurchase ? 'first' : null);
        return;
      }

      setDiscountError(null);
      setAppliedGenericCode(null);
      setDiscountCode(normalized);
      setActiveDiscount('birthday');
      return;
    }

    const matchedGeneric = genericCodes.find(
      (code) => code.code.toUpperCase() === normalized,
    );
    if (matchedGeneric) {
      setDiscountError(null);
      setAppliedGenericCode({ ...matchedGeneric, code: normalized });
      setDiscountCode(normalized);
      setActiveDiscount('generic');
      return;
    }

    setDiscountError('Neteisingas nuolaidos kodas.');
    setAppliedGenericCode(null);
    setActiveDiscount(eligibleFirstPurchase ? 'first' : null);
  };

  const handleClearDiscount = () => {
    setDiscountCode('');
    setDiscountError(null);
    setAppliedGenericCode(null);
    setActiveDiscount(eligibleFirstPurchase ? 'first' : null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!plan || !selectedPeriod || !activePricing) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        period_days: selectedPeriod,
        payment_method: paymentMethod,
        buyer_full_name: buyerFullName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone || undefined,
        discount_code:
          activeDiscount && activeDiscount !== 'first' ? discountCode.trim().toUpperCase() : undefined,
        card_number: paymentMethod === 'card' ? cardNumber : undefined,
        card_exp_month: paymentMethod === 'card' ? cardExpMonth : undefined,
        card_exp_year: paymentMethod === 'card' ? cardExpYear : undefined,
        card_cvc: paymentMethod === 'card' ? cardCvc : undefined,
        invoice_needed: invoiceNeeded,
        company_name: invoiceNeeded ? companyName || undefined : undefined,
        company_code: invoiceNeeded ? companyCode || undefined : undefined,
        vat_code: invoiceNeeded ? vatCode || undefined : undefined,
        extra_notes: extraNotes || undefined,
      } as const;

      const response = await checkoutPlan(plan.id, payload);
      await refreshProfile();
      navigate(`/checkout/success/${response.purchase_id}`, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          setErrorMessage(detail);
        } else {
          setErrorMessage('Nepavyko atlikti apmokėjimo. Patikrinkite duomenis ir bandykite dar kartą.');
        }
      } else {
        setErrorMessage('Nepavyko atlikti apmokėjimo. Patikrinkite duomenis ir bandykite dar kartą.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="page-loading">Ruošiame apmokėjimo langą...</div>;
  }

  if (!plan) {
    return (
      <div className="page-card">
        <h2>Planas nerastas</h2>
        <p>Pabandykite grįžti į planų biblioteką ir pasirinkti kitą planą.</p>
        <button type="button" className="secondary-button" onClick={() => navigate('/plans')}>
          Grįžti į planus
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-page__columns">
        <div className="checkout-page__summary">
          <button type="button" className="checkout-page__back" onClick={() => navigate(`/plans/${plan.id}`)}>
            ← Atgal į plano detales
          </button>
          <div>
            <h1 style={{ marginTop: 16 }}>Apmokėjimas už „{plan.name}“</h1>
            <p>Užbaikite apmokėjimą ir gaukite individualiai sugeneruotą planą su PDF atsisiuntimu.</p>
          </div>

          <div className="plan-card checkout-plan-card" style={{ marginTop: 8 }}>
            <span className="plan-pill">{renderGoalLabel(plan.goal_type)}</span>
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            {activePricing && (
              <div style={{ marginTop: 12, fontWeight: 600 }}>
                <span style={{ fontSize: '1.4rem' }}>{totalAmount}</span>
                <span style={{ marginLeft: 8, opacity: 0.7 }}>/ {formatPeriod(activePricing.period_days)}</span>
              </div>
            )}
            {plan.calories && (
              <p className="plan-card__meta" style={{ marginTop: 12 }}>
                {plan.calories} kcal per dieną · {plan.protein_grams ?? 0} g baltymų · {plan.carbs_grams ?? 0} g angliavandenių ·{' '}
                {plan.fats_grams ?? 0} g riebalų
              </p>
            )}
          </div>

          {pricingSummary && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 16,
                border: '1px solid rgba(59, 130, 246, 0.2)',
                background: 'rgba(59, 130, 246, 0.08)',
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Bazinė suma</span>
                <strong>{formatCurrency(pricingSummary.basePrice, pricingSummary.currency)}</strong>
              </div>
              {pricingSummary.discountAmount > 0 && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      color: '#1d4ed8',
                      fontWeight: 600,
                    }}
                  >
                    <span>{activeDiscountLabel ?? 'Nuolaida'}</span>
                    <span>-{formatCurrency(pricingSummary.discountAmount, pricingSummary.currency)}</span>
                  </div>
                  <small style={{ color: '#1d4ed8' }}>
                    {activeDiscount === 'birthday'
                      ? 'Gimtadienio kodas pritaikytas šiam pirkimui.'
                      : activeDiscount === 'generic' && appliedGenericCode
                        ? `Kodas ${appliedGenericCode.code} pritaikytas šiam užsakymui.`
                        : 'Pirmo pirkimo nuolaida pritaikyta automatiškai.'}
                  </small>
                </>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                }}
              >
                <span>Galutinė kaina</span>
                <span>{totalAmount}</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="checkout-page__form">
          <h2>Užsakymo detalės</h2>
          {errorMessage && <div className="error-banner">{errorMessage}</div>}

          <label className="form-label" htmlFor="checkout-period">
            Periodo trukmė
          </label>
          <select
            id="checkout-period"
            value={selectedPeriod ?? ''}
            onChange={(event) => setSelectedPeriod(Number(event.target.value))}
            className="input-select"
            style={{ fontWeight: 600, padding: '10px 14px', borderRadius: 12 }}
          >
            {periodOptions.map((option) => (
              <option key={option.period_days} value={option.period_days}>
                {formatPeriod(option.period_days)} — {formatCurrency(option.final_price, option.currency)}
              </option>
            ))}
          </select>

          <div className="grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="form-field">
              <label htmlFor="buyer-full-name">Vardas ir pavardė</label>
              <input
                id="buyer-full-name"
                value={buyerFullName}
                onChange={(event) => setBuyerFullName(event.target.value)}
                required
                placeholder="Vardenis Pavardenis"
              />
            </div>
            <div className="form-field">
              <label htmlFor="buyer-email">El. paštas</label>
              <input
                id="buyer-email"
                type="email"
                value={buyerEmail}
                onChange={(event) => setBuyerEmail(event.target.value)}
                required
                placeholder="vardas@pastas.lt"
              />
            </div>
          </div>

  <div className="form-field">
    <label htmlFor="buyer-phone">Telefono numeris</label>
    <input
      id="buyer-phone"
      value={buyerPhone}
      onChange={(event) => setBuyerPhone(event.target.value)}
      placeholder="+370..."
    />
  </div>

  <div className="form-field">
    <label htmlFor="payment-method">Mokėjimo būdas</label>
    <select
      id="payment-method"
      value={paymentMethod}
      onChange={(event) => setPaymentMethod(event.target.value as 'card' | 'bank_transfer' | 'cash')}
    >
      {paymentMethods.map((method) => (
        <option key={method.value} value={method.value}>
          {method.label}
        </option>
      ))}
    </select>
  </div>

  {paymentMethod === 'card' && (
    <div
      style={{
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 16,
        padding: 16,
        background: 'rgba(129, 140, 248, 0.08)',
        display: 'grid',
        gap: 12,
      }}
    >
      <strong>Bankinės kortelės duomenys</strong>
      <div className="form-field">
        <label htmlFor="card-number">Kortelės numeris</label>
        <input
          id="card-number"
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
          placeholder="1234 5678 9012 3456"
          required
        />
      </div>
      <div className="grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <div className="form-field">
          <label htmlFor="card-exp-month">Galiojimo mėnuo</label>
          <input
            id="card-exp-month"
            value={cardExpMonth}
            onChange={(event) => setCardExpMonth(event.target.value)}
            placeholder="MM"
            maxLength={2}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="card-exp-year">Galiojimo metai</label>
          <input
            id="card-exp-year"
            value={cardExpYear}
            onChange={(event) => setCardExpYear(event.target.value)}
            placeholder="YY"
            maxLength={4}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="card-cvc">CVC</label>
          <input
            id="card-cvc"
            value={cardCvc}
            onChange={(event) => setCardCvc(event.target.value)}
            placeholder="123"
            maxLength={4}
            required
          />
        </div>
      </div>
    </div>
  )}

  <div className="form-field">
    <label htmlFor="discount-code">Nuolaidos kodas</label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <input
        id="discount-code"
        value={discountCode}
        onChange={(event) => setDiscountCode(event.target.value)}
        placeholder="pvz., BIRTHDAY15"
        style={{ flex: '1 1 200px' }}
      />
      <button type="button" className="secondary-button" onClick={handleApplyDiscount}>
        Pritaikyti kodą
      </button>
      {(activeDiscount === 'birthday' || activeDiscount === 'generic' || discountCode) && (
        <button type="button" className="secondary-button" onClick={handleClearDiscount}>
          Išvalyti
        </button>
      )}
    </div>
    {discountError ? (
      <small style={{ color: '#dc2626' }}>{discountError}</small>
    ) : activeDiscount === 'birthday' ? (
      <small style={{ color: '#16a34a' }}>Gimtadienio kodas pritaikytas! Galutinė kaina sumažinta 15%.</small>
    ) : activeDiscount === 'generic' && appliedGenericCode ? (
      <small style={{ color: '#16a34a' }}>
        Kodas {appliedGenericCode.code} pritaikytas! Galutinė kaina sumažinta {Math.round(appliedGenericCode.percent * 100)}%.
      </small>
    ) : activeDiscount === 'first' && eligibleFirstPurchase ? (
      <small style={{ color: '#1d4ed8' }}>Pirmo pirkimo nuolaida -15% taikoma automatiškai.</small>
    ) : (
      <small style={{ color: '#6b7280' }}>Įveskite galiojantį nuolaidos kodą (pvz., BIRTHDAY15).</small>
    )}
  </div>

  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <input
      type="checkbox"
      checked={invoiceNeeded}
      onChange={(event) => setInvoiceNeeded(event.target.checked)}
    />
    Reikalinga sąskaita faktūra įmonei
  </label>

  {invoiceNeeded && (
    <div
      style={{
        border: '1px dashed rgba(99, 102, 241, 0.4)',
        borderRadius: 16,
        padding: 16,
        display: 'grid',
        gap: 12,
      }}
    >
      <div className="form-field">
        <label htmlFor="company-name">Įmonės pavadinimas</label>
        <input
          id="company-name"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="company-code">Įmonės kodas</label>
        <input
          id="company-code"
          value={companyCode}
          onChange={(event) => setCompanyCode(event.target.value)}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="vat-code">PVM kodas (jei yra)</label>
        <input
          id="vat-code"
          value={vatCode}
          onChange={(event) => setVatCode(event.target.value)}
        />
      </div>
    </div>
  )}

  <div className="form-field">
    <label htmlFor="extra-notes">Papildomos pastabos</label>
    <textarea
      id="extra-notes"
      value={extraNotes}
      onChange={(event) => setExtraNotes(event.target.value)}
      rows={3}
      placeholder="Papildomi norai, alergijos, komentarai komandai..."
    />
  </div>

  <button
    type="submit"
    className="primary-button"
    disabled={isSubmitting || !activePricing}
    style={{ marginTop: 12 }}
  >
    {isSubmitting ? 'Apmokėjimas vykdomas...' : `Apmokėti ${totalAmount ?? ''}`}
  </button>

  <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
    Paspaudę „Apmokėti“ sutinkate su FitBite paslaugų teikimo ir privatumo sąlygomis. Mokėjimo metu iš karto gausite PDF kvitą
    ir planą atsisiuntimui.
  </p>
</form>
      </div>
    </div>
  );
};

export default CheckoutPage;
