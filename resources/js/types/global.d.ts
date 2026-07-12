declare module '@inertiajs/core' {
  interface PageProps {
    appName: string;
    auth: {
      user: { id: number; name: string; email: string; role: 'user' | 'admin'; email_verified_at: string | null } | null
    };
    flash: { success?: string; status?: string };
  }
}

export {};
