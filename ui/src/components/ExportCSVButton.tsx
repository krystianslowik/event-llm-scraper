interface ExportCSVButtonProps {
    data: any[];
    filename?: string;
}

export function ExportCSVButton({ data, filename = 'export.csv' }: ExportCSVButtonProps) {
    const handleExport = () => {
        if (!data || data.length === 0) {
            alert('No data to export!');
            return;
        }

        const header = Object.keys(data[0]);
        const csvRows = [];

        csvRows.push(header.join(','));
        for (const row of data) {
            const values = header.map((field) => {
                let cell = row[field];
                if (typeof cell === 'string') {
                    cell = cell.replace(/"/g, '""');
                    return `"${cell}"`;
                }
                return cell;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-all bg-white text-blue-600 shadow-sm hover:bg-blue-50"
        >
            Export to CSV
        </button>
    );
}