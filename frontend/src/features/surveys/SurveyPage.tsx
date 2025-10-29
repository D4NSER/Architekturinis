import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchCurrentUser } from '../../api/users';

import { fetchSurvey, submitSurvey, SurveyDetail, SurveyQuestion, SurveySubmitAnswer } from '../../api/surveys';

const SurveyPage = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();

  const numericSurveyId = useMemo(() => (surveyId ? Number(surveyId) : NaN), [surveyId]);

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isSubmitted, setSubmitted] = useState(false);
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const readOnly = params.get('view') === 'readonly' || Boolean((location.state as any)?.readOnlyFromProfile);

  // If opened read-only, we may fetch user's completed surveys to populate answers

  useEffect(() => {
    const load = async () => {
      if (!surveyId || Number.isNaN(numericSurveyId)) {
        setError('Nerastas apklausos identifikatorius.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const detail = await fetchSurvey(numericSurveyId);
        setSurvey(detail);
        const initial: Record<string, unknown> = {};
        detail.questions.forEach((question) => {
          switch (question.type) {
            case 'multi_choice':
              initial[question.id] = [];
              break;
            default:
              initial[question.id] = '';
              break;
          }
        });
        setAnswers(initial);
      } catch (err) {
        setError('Nepavyko įkelti apklausos. Pabandykite dar kartą.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [surveyId, numericSurveyId]);

  // populate read-only answers for completed surveys (if available via profile payload)
  useEffect(() => {
    if (!readOnly || !survey) return;
    const populate = async () => {
      // First try to use answers passed via navigation state
      const stateAny = location.state as any;
      if (stateAny && stateAny.answers) {
        setAnswers((prev) => ({ ...prev, ...stateAny.answers }));
        return;
      }

      // Otherwise fetch current user and look for completed survey entry
      try {
        const user = await fetchCurrentUser();
        const found = (user.plan_completed_surveys ?? []).find((s: any) => s.id === Number(surveyId));
        if (found && Array.isArray(found.answers)) {
          const mapped: Record<string, unknown> = {};
          found.answers.forEach((a: any) => {
            mapped[a.question_id] = a.answer;
          });
          setAnswers((prev) => ({ ...prev, ...mapped }));
        }
      } catch (err) {
        // ignore, it's safe to continue without answers
      }
    };
    populate();
  }, [readOnly, survey, surveyId, location.state]);

  const handleScaleChange = (questionId: string, value: number) => {
    if (readOnly) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSingleChoiceChange = (questionId: string, value: string) => {
    if (readOnly) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultiChoiceChange = (questionId: string, option: string, checked: boolean) => {
    if (readOnly) return;
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      }
      return { ...prev, [questionId]: current.filter((item) => item !== option) };
    });
  };

  const handleTextChange = (questionId: string, value: string) => {
    if (readOnly) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const validateBeforeSubmit = () => {
    if (!survey) return false;
    for (const question of survey.questions) {
      const value = answers[question.id];
      if (question.type === 'multi_choice') {
        if (!Array.isArray(value) || value.length === 0) return false;
      } else if (question.type === 'scale') {
        if (typeof value !== 'number') return false;
      } else {
        if (typeof value !== 'string') return false;
        if (!value.trim()) {
          // allow optional text when help_text suggests optional?
          if (question.help_text && question.help_text.toLowerCase().includes('galite palikti tuščią')) {
            continue;
          }
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!survey || !surveyId) return;

    const prepared: SurveySubmitAnswer[] = survey.questions.map((question) => {
      const value = answers[question.id];
      if (question.type === 'scale') {
        return { question_id: question.id, value: Number(value) };
      }
      if (question.type === 'multi_choice') {
        return { question_id: question.id, value: Array.isArray(value) ? value : [] };
      }
      return { question_id: question.id, value: typeof value === 'string' ? value : '' };
    });

    try {
      setSubmitting(true);
      setError(null);
      await submitSurvey(Number(surveyId), { answers: prepared });
      setSubmitted(true);
      await fetchSurvey(Number(surveyId)).then(setSurvey).catch(() => undefined);
    } catch (err) {
      setError('Nepavyko išsaugoti atsakymų. Bandykite dar kartą.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-loading">Krauname apklausą...</div>;
  }

  if (error) {
    return (
      <div className="page-card" style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 16 }}>
        <h2>Klaida</h2>
        <p>{error}</p>
        <button type="button" className="primary-button" onClick={() => navigate('/profile')}>
          Grįžti į profilį
        </button>
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  // When opened read-only we want to show the survey (answers) even if it's completed
  if (!readOnly && (isSubmitted || survey.status === 'completed')) {
    return (
      <div className="page-card" style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 16 }}>
        <h2>Ačiū!</h2>
        <p>Apklausą jau užpildėte. Jūsų atsakymai padės mums tobulinti mitybos planus.</p>
        <button type="button" className="primary-button" onClick={() => navigate('/profile')}>
          Grįžti į profilį
        </button>
      </div>
    );
  }

  if (!readOnly && !survey.can_submit) {
    return (
      <div className="page-card" style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 16 }}>
        <h2>Apklausa dar neaktyvi</h2>
        <p>
          Šią apklausą bus galima užpildyti nuo{' '}
          <strong>{new Date(survey.scheduled_at).toLocaleString('lt-LT')}</strong>. Priminsime apie ją profilio skiltyje.
        </p>
        <button type="button" className="primary-button" onClick={() => navigate('/profile')}>
          Grįžti į profilį
        </button>
      </div>
    );
  }

  const renderQuestion = (question: SurveyQuestion) => {
    switch (question.type) {
      case 'scale': {
        const min = question.scale_min ?? 1;
        const max = question.scale_max ?? 5;
        const currentValue = typeof answers[question.id] === 'number' ? (answers[question.id] as number) : 0;
        const options = Array.from({ length: max - min + 1 }, (_, index) => min + index);
        return (
          <div className="survey-question__options">
            <div className="survey-question__labels">
              {question.scale_min_label && <span>{question.scale_min_label}</span>}
              {question.scale_max_label && <span>{question.scale_max_label}</span>}
            </div>
            <div className="survey-question__scale">
              {options.map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={currentValue === option}
                        onChange={!readOnly ? () => handleScaleChange(question.id, option) : undefined}
                        required={!readOnly}
                        disabled={readOnly}
                      />
                      <span>{option}</span>
                    </label>
              ))}
            </div>
          </div>
        );
      }
      case 'single_choice': {
        const currentValue = typeof answers[question.id] === 'string' ? (answers[question.id] as string) : '';
        return (
          <div className="survey-question__options">
            {(question.options ?? []).map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={currentValue === option}
                  onChange={!readOnly ? () => handleSingleChoiceChange(question.id, option) : undefined}
                  required={!readOnly}
                  disabled={readOnly}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      }
      case 'multi_choice': {
        const currentValue = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
        return (
          <div className="survey-question__options survey-question__options--column">
            {(question.options ?? []).map((option) => (
                <label key={option}>
                  <input
                    type="checkbox"
                    name={`${question.id}-${option}`}
                    value={option}
                    checked={currentValue.includes(option)}
                    onChange={!readOnly ? (event) => handleMultiChoiceChange(question.id, option, event.target.checked) : undefined}
                    disabled={readOnly}
                  />
                  <span>{option}</span>
                </label>
            ))}
          </div>
        );
      }
      case 'text':
      default: {
        const currentValue = typeof answers[question.id] === 'string' ? (answers[question.id] as string) : '';
        return (
            <textarea
              value={currentValue}
              onChange={!readOnly ? (event) => handleTextChange(question.id, event.target.value) : undefined}
              rows={4}
              placeholder={readOnly ? '' : 'Įrašykite atsakymą'}
              readOnly={readOnly}
            />
        );
      }
    }
  };

  return (
    <div className="survey-page">
      <div className="survey-page__card">
        <h1>{survey.survey_type === 'final' ? 'Galutinė mitybos plano apklausa' : 'Progress apklausa'}</h1>
        <p>
          Planas: <strong>{survey.plan_name}</strong>
        </p>
        <p style={{ opacity: 0.75 }}>
          Apklausos data:{' '}
          {new Date(survey.scheduled_at).toLocaleDateString('lt-LT')}
        </p>

        <form onSubmit={handleSubmit} className="survey-form">
          {survey.questions.map((question) => (
            <div key={question.id} className="survey-question">
              <label className="survey-question__prompt">
                {question.prompt}
                {question.help_text && <small>{question.help_text}</small>}
              </label>
              {renderQuestion(question)}
            </div>
          ))}

          {error && <div className="error-banner">{error}</div>}

          {!readOnly && (
            <button type="submit" className="primary-button" disabled={isSubmitting || !validateBeforeSubmit()}>
              {isSubmitting ? 'Siunčiame atsakymus...' : 'Pateikti atsakymus'}
            </button>
          )}
        </form>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="secondary-button" onClick={() => navigate('/profile')}>
            Grįžti į profilį
          </button>
          <Link className="secondary-button" to="/plans">
            Peržiūrėti kitus planus
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;
