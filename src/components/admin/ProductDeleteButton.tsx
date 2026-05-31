"use client";

type ProductDeleteButtonProps = {
  action: () => Promise<void>;
  productName: string;
};

export function ProductDeleteButton({ action, productName }: ProductDeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete "${productName}"? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <button className="admin-icon-action danger" type="submit" aria-label={`Delete ${productName}`} title="Delete product">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      </button>
    </form>
  );
}
