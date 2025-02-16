interface FormCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function FormCheckbox({ label, checked, onChange, className = '' }: FormCheckboxProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
    </div>
  );
}