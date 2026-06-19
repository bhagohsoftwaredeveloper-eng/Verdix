'use client';

const STATUS_STEPS = ['Reported', 'Return Requested', 'Details', 'Resolved'] as const;

const STATUS_INDEX_MAP: Record<string, number> = {
  Reported: 0,
  'Return Requested': 1,
  Replaced: 3,
  Credited: 3,
  Resolved: 3,
};

interface StatusTimelineProps {
  currentStatus: string;
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentStepIndex = STATUS_INDEX_MAP[currentStatus] ?? 0;

  return (
    <div className="relative py-4">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
      <div className="relative z-10 flex justify-between">
        {STATUS_STEPS.map((step, index) => {
          // Hidden spacer to keep layout balanced
          if (step === 'Details') {
            return (
              <div key={step} className="flex flex-col items-center opacity-0 pointer-events-none">
                <div className="w-4 h-4 rounded-full bg-muted" />
              </div>
            );
          }

          const isCompleted = index <= currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <div key={step} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <span className="text-xs font-bold">✓</span>
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
