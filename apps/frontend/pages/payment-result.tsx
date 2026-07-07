import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PaymentResultRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    router.replace({ pathname: '/order-status', query: router.query });
  }, [router]);

  return null;
}
