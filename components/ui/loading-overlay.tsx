import { Spinner } from "@/components/ui/spinner";

type LoadingOverlayProps = {
  show: boolean;
  label?: string;
};

export function LoadingOverlay({ show, label = "Loading" }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-tertiary-100/85 backdrop-blur-[1px]"
      aria-busy="true"
      aria-label={label}
    >
      <Spinner className="size-7 text-primary-900" label={label} />
    </div>
  );
}
