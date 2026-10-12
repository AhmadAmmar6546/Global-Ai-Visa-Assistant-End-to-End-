import {
  LoaderCircle,
  ArrowRight,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import {
  cloneElement,
  useId,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactElement<Record<string, unknown>>;
  hint?: string;
}) {
  const generatedId = useId();
  const controlId =
    typeof children.props.id === "string"
      ? children.props.id
      : `${generatedId}-control`;
  const labelId = `${generatedId}-label`;
  const hintId = `${generatedId}-hint`;
  const existingDescription =
    typeof children.props["aria-describedby"] === "string"
      ? children.props["aria-describedby"]
      : "";
  const description = [existingDescription, hint ? hintId : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="field">
      <label id={labelId} htmlFor={controlId}>
        {label}
      </label>
      {cloneElement(children, {
        id: controlId,
        "aria-labelledby": labelId,
        ...(description ? { "aria-describedby": description } : {}),
      })}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
export function Notice({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "warning" | "error" | "success";
}) {
  return (
    <div
      className={`notice notice-${variant}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <AlertCircle size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: string;
}) {
  return (
    <span className={`badge badge-${variant.toLowerCase()}`}>{children}</span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <FolderOpen size={28} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function LoadingState({
  label = "Getting everything ready…",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  );
}
export function ArrowLink({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ArrowRight size={16} />
    </>
  );
}
