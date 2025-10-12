import type { ChangeEventHandler, FC, ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  placeholder?: string;
  as?: 'input' | 'textarea';
  required?: boolean;
  autoComplete?: string;
  children?: ReactNode;
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
        />
      )}
      {children}
    </div>
  );
};

export default FormField;
