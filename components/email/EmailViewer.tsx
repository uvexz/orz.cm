import { useCallback, useEffect, useMemo, useRef } from "react";

const EmailViewer = ({ email }: { email: string }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const cleanupObserver = useCallback(() => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
  }, []);

  const adjustHeight = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;

    if (!iframe || !doc) {
      return;
    }

    const height = Math.max(
      doc.body?.scrollHeight ?? 0,
      doc.documentElement?.scrollHeight ?? 0,
    );

    iframe.style.height = `${height + 20}px`;
  }, []);

  const srcDoc = useMemo(
    () => `<!DOCTYPE html>
<html>
  <head>
    <style>
      * {
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>${email}</body>
</html>`,
    [email],
  );

  const handleLoad = useCallback(() => {
    cleanupObserver();
    adjustHeight();

    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      adjustHeight();
    });

    observer.observe(doc.body);

    if (doc.documentElement) {
      observer.observe(doc.documentElement);
    }

    resizeObserverRef.current = observer;
  }, [adjustHeight, cleanupObserver]);

  useEffect(() => cleanupObserver, [cleanupObserver]);

  return (
    <iframe
      ref={iframeRef}
      title="Email Content"
      sandbox="allow-same-origin allow-popups"
      srcDoc={srcDoc}
      onLoad={handleLoad}
      style={{
        width: "100%",
        border: "none",
        display: "block",
        minHeight: "100px",
      }}
    />
  );
};

export default EmailViewer;
