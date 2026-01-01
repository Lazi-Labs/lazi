export default function PricebookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex-1 overflow-auto">
      {children}
    </div>
  );
}
