import { redirect } from 'next/navigation';

// The app decides what to show: AppShell sends people without a session to /login.
export default function RootPage() {
  redirect('/app');
}
