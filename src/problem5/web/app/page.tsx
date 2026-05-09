import { redirect } from 'next/navigation';

// `/` is not a meaningful surface for this app — the only landing page is
// `/tasks`. A redirect keeps shareable URLs short and documents intent.
export default function HomePage() {
  redirect('/tasks');
}
