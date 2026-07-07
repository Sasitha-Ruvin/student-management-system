import { Spinner } from "@/components/ui/spinner";

type SubmitButtonProps = React.ComponentProps<"button"> & {
  loading?: boolean;
  loadingText?: string;
};

export function SubmitButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className = "",
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-900 px-6 py-2.5 text-sm font-medium text-tertiary-100 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-4" label={loadingText ?? "Loading"} />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
