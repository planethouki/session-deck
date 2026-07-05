import { Head } from '@inertiajs/react';

type HomeProps = {
    appName: string;
    framework: string;
};

export default function Home({ appName, framework }: HomeProps) {
    return (
        <>
            <Head title="Home" />
            <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
                <section className="max-w-2xl text-center">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-400">
                        {appName}
                    </p>
                    <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                        React + TypeScript + Inertia.js
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-slate-300">
                        {framework} と React を、ひとつのリポジトリで開発できる構成になりました。
                    </p>
                </section>
            </main>
        </>
    );
}
