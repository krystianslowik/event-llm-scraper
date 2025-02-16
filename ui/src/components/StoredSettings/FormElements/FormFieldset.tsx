import React from 'react';

interface FormFieldsetProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
}

export function FormFieldset({ legend, children, className = '' }: FormFieldsetProps) {
  return (
    <fieldset className={`border border-gray-200 rounded-md p-3 ${className}`}>
      <legend className="px-2 text-xs font-bold text-gray-700">{legend}</legend>
      {children}
    </fieldset>
  );
}