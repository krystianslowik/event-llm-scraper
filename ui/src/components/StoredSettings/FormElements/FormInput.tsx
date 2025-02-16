interface FormInputProps {
  label: string;
  type: 'text' | 'number' | 'url';
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
}

export function FormInput({ label, type, value, onChange, placeholder, className = '' }: FormInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm ${className}`}
      />
    </div>
  );
}