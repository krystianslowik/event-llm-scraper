interface ScoreDisplayProps {
  score: number;
  accuracy: number;
  completeness: number;
  scraped: number;
  expected: number;
  calculatedAt: string;
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'bg-green-500';
  else if (score >= 0.5) return 'bg-yellow-500';
  else return 'bg-red-500';
}

export function ScoreDisplay({ score, accuracy, completeness, scraped, expected, calculatedAt }: ScoreDisplayProps) {
  return (
    <div className="border p-3 rounded-md shadow-sm bg-white">
      <div className="flex items-center justify-around">
        <span className="font-medium text-gray-700">Score:</span>
        <span className={`px-2 py-1 rounded text-white ${getScoreColor(score)}`}>
          {(score * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-600">
        Accuracy: {(accuracy * 100).toFixed(0)}%, Completeness: {(completeness * 100).toFixed(0)}%; (`${scraped}/${expected}`)
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Calculated At: {new Date(calculatedAt).toLocaleString()}
      </div>
    </div>
  );
}