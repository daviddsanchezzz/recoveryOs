import { AuthForm } from '../../components/auth-form';

export default function LoginPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-5 py-12"
      style={{
        background: 'radial-gradient(ellipse at top, rgba(84,113,90,0.12) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(181,107,69,0.10) 0%, transparent 50%), #f0ebe0',
      }}
    >
      <AuthForm mode="login" />
    </main>
  );
}
