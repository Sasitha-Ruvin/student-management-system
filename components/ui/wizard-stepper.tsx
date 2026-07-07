"use client";

export type WizardStepConfig = {
  id: number;
  label: string;
};

type WizardStepperProps = {
  steps: WizardStepConfig[];
  currentStep: number;
};

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <nav aria-label="Registration progress" className="w-full">
      <ol className="flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isComplete = step.id < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={["flex flex-1 items-center", isLast ? "flex-none" : ""].join(" ")}
            >
              <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <span
                  className={[
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isActive
                      ? "bg-primary-900 text-tertiary-100"
                      : isComplete
                        ? "bg-primary-900/80 text-tertiary-100"
                        : "bg-secondary-200 text-neutral-600",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  {step.id}
                </span>
                <span
                  className={[
                    "hidden text-[10px] font-medium tracking-widest uppercase sm:block",
                    isActive ? "text-primary-900" : "text-neutral-500",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>
              {!isLast ? (
                <span
                  className={[
                    "mx-2 hidden h-px flex-1 sm:block",
                    isComplete ? "bg-primary-900" : "bg-secondary-300",
                  ].join(" ")}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
