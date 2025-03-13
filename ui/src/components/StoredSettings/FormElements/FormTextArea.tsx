interface FormTextAreaProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  defaultValue?: string;
}

export function FormTextArea({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  rows = 6, 
  className = '',
  defaultValue = ''
}: FormTextAreaProps) {
  // Force a default value if value is null or undefined
  const displayValue = value === null || value === undefined ? defaultValue : value;
  
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <textarea
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm ${className}`}
      />
      {!value && defaultValue && (
        <p className="text-xs text-blue-600 mt-1">Using default value</p>
      )}
    </div>
  );
}