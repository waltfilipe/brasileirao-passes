"use client";

import { Suspense } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useI18n } from "@/lib/i18n/context";
import ComparePageContent from "./ComparePageContent";

function CompareFallback() {
  const { m } = useI18n();
  return <LoadingState message={m.compare.loading} />;
}

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareFallback />}>
      <ComparePageContent />
    </Suspense>
  );
}
