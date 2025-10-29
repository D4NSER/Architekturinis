import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { downloadPurchaseReceipt, fetchPurchaseDetail } from '../../api/purchases';
import type { PurchaseDetail } from '../../types';

const dayLabelMap: Record<string, string> = {
  monday: 'Pirmadienis',
  tuesday: 'Antradienis',
  wednesday: 'Trečiadienis',
  thursday: 'Ketvirtadienis',
  friday: 'Penktadienis',
  saturday: 'Šeštadienis',
  sunday: 'Sekmadienis',
};

const formatCurrency = (value: number, currency = 'EUR') =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency }).format(value);

const CheckoutSuccessPage = () => {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setDownloading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!purchaseId) {
        setErrorMessage('Nerastas pirkimo identifikatorius.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const detail = await fetchPurchaseDetail(Number(purchaseId));
        setPurchase(detail);
      } catch (err) {
        setErrorMessage('Nepavyko rasti pirkimo informacijos.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [purchaseId]);

  const groupedMeals = useMemo(() => {
    const grouping: Record<string, PurchaseDetail['items']> = {};
    if (!purchase) return grouping;
    purchase.items.forEach((item) => {
      if (!grouping[item.day_of_week]) {
        grouping[item.day_of_week] = [];
      }
      grouping[item.day_of_week]!.push(item);
    });
    return grouping;
  }, [purchase]);

  const handleDownload = async () => {
    if (!purchaseId) return;
    setDownloading(true);
    try {
      const blob = await downloadPurchaseReceipt(Number(purchaseId));
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `FitBite_planas_${purchase?.plan_name_snapshot ?? 'planas'}.pdf`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setErrorMessage('Nepavyko atsisiųsti PDF kvito. Bandykite dar kartą.');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return <div className="page-loading">Fiksuojame apmokėjimą...</div>;
  }

  if (!purchase) {
    return (
      <div className="page-card">
        <h2>Pirkimas nerastas</h2>
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <button type="button" className="secondary-button" onClick={() => navigate('/plans')}>
          Grįžti į planus
        </button>
      </div>
    );
  }

  return (
    <div className="thankyou-page">
      <div className="success-banner">
        <strong>Ačiū už pirkimą!</strong> Jūsų mitybos planas paruoštas atsisiuntimui ir pasiekiamas paskyros skiltyje
        „Pirkimai“.
      </div>

      <div className="thankyou-page__columns">
        <section className="plan-card thankyou-page__summary" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div>
            <h1>{purchase.plan_name_snapshot}</h1>
            <p>
              Periodas: {purchase.period_days} dienų · Suma: {formatCurrency(purchase.total_price, purchase.currency)} ·
              Apmokėjimo būdas: {purchase.payment_method === 'card' ? 'Bankinė kortelė' : purchase.payment_method === 'bank_transfer' ? 'Bankinis pavedimas' : 'Grynais atsiimant'}
            </p>
            <p>
              Bazinė kaina: {formatCurrency(purchase.base_price, purchase.currency)}
              {purchase.discount_amount > 0 && (
                <>
                  {' · '}
                  {purchase.discount_label ?? 'Nuolaida'}: -{formatCurrency(purchase.discount_amount, purchase.currency)}
                  {purchase.discount_code && ` (kodas ${purchase.discount_code})`}
                </>
              )}
            </p>
            <small style={{ color: '#4b5563' }}>
              Užsakymo Nr. FIT-{purchase.id.toString().padStart(6, '0')} ·{' '}
              {purchase.paid_at ? new Date(purchase.paid_at).toLocaleString('lt-LT') : 'Laukia apmokėjimo'}
            </small>
          </div>
          {errorMessage && <div className="error-banner">{errorMessage}</div>}

          <div className="thankyou-page__actions">
            <button type="button" className="primary-button" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? 'Ruošiame PDF...' : 'Atsisiųsti planą (PDF)'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate(`/plans/${purchase.plan_id}`)}>
              Peržiūrėti planą
            </button>
            <Link to="/profile" className="secondary-button">
              Eiti į paskyrą
            </Link>
            <Link to="/plans" className="secondary-button">
              Kiti planai
            </Link>
          </div>
        </section>

        <section className="thankyou-page__menu">
          <h2>Savaitės meniu</h2>
          <p style={{ marginBottom: 8 }}>Įtraukti patiekalai pagal dienas. Pilnas planas pateiktas PDF dokumente.</p>
          <div style={{ display: 'grid', gap: 16 }}>
            {Object.entries(groupedMeals).map(([day, items]) => (
              <div key={day} style={{ border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ marginBottom: 8 }}>{dayLabelMap[day] ?? day}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                  {items.map((item) => (
                    <li key={item.id}>
                      <strong>{item.meal_type.toUpperCase()}</strong>: {item.meal_title}
                      {item.meal_description && (
                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{item.meal_description}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
