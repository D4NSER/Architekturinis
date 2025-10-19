import type { ChangeEventHandler, FC, ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  placeholder?: string;
  as?: 'input' | 'textarea' | 'select';
  required?: boolean;
  autoComplete?: string;
  children?: ReactNode;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
}

export const FormField: FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  as = 'input',
  required,
  autoComplete,
  children,
  options,
  min,
  max,
}) => {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {as === 'textarea' ? (
        <textarea
          id={id}
          name={id}
          value={value}
          onChange={onChange as ChangeEventHandler<HTMLTextAreaElement>}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          rows={3}
        />
      ) : as === 'select' ? (
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange as ChangeEventHandler<HTMLSelectElement>}
          required={required}
        >
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={id}
          value={value}
          onChange={onChange as ChangeEventHandler<HTMLInputElement>}
          type={type}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          min={min}
          max={max}
        />
      )}
      {children}
    </div>
  );
};

export default FormField;
