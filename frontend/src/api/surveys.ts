import { apiClient } from './client';

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: 'scale' | 'single_choice' | 'multi_choice' | 'text';
  help_text?: string | null;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string | null;
  scale_max_label?: string | null;
}

export interface SurveyDetail {
  id: number;
  survey_type: 'progress' | 'final';
  status: 'scheduled' | 'completed' | 'cancelled';
  plan_name: string;
  day_offset: number;
  scheduled_at: string;
  questions: SurveyQuestion[];
  can_submit: boolean;
}

export interface SurveySubmitAnswer {
  question_id: string;
  value: number | string | string[];
}

export interface SurveySubmitRequest {
  answers: SurveySubmitAnswer[];
}

export interface SurveySubmitResponse {
  id: number;
  submitted_at: string;
}

export const fetchSurvey = async (surveyId: number): Promise<SurveyDetail> => {
  const { data } = await apiClient.get<SurveyDetail>(`/surveys/${surveyId}`);
  return data;
};

export const submitSurvey = async (surveyId: number, payload: SurveySubmitRequest): Promise<SurveySubmitResponse> => {
  const { data } = await apiClient.post<SurveySubmitResponse>(`/surveys/${surveyId}/responses`, payload);
  return data;
};

