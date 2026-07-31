export default function MandakeAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        rel="stylesheet"
        href="/demo/mandake-analytics-harness.css"
        data-clarity-unmask="true"
        precedence="default"
      />
      <div className="mandake-harness-root">{children}</div>
    </>
  );
}
