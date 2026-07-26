import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@code-to-escape/ui';

export function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-6">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-sm uppercase tracking-[0.3em] text-brand-50/70">404</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Page not found</h1>
        <p className="mt-3 text-brand-50">The route you requested does not exist yet.</p>
        <Link to="/" className="mt-8 inline-block">
          <Button variant="primary">Back to home</Button>
        </Link>
      </motion.div>
    </section>
  );
}
